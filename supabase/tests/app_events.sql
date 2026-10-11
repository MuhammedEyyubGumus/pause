-- PAUSE · Migration 008 testi: anonim ürün olayları
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values ('aaaaaaaa-8888-0000-0000-000000000001', 'a8@test.local');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-8888-0000-0000-000000000001', true);

insert into public.app_events (session_id, name, props, app_version)
values ('11111111-0000-0000-0000-000000000001', 'urge_step', '{"step":"intensity","mode":"live"}', 'abc123');

do $$ begin
  -- Kullanıcı yazabilir ama okuyamaz (kendi yazdığını bile)
  begin
    perform 1 from public.app_events;
    raise exception 'TEST FAILED: kullanıcı ürün olaylarını okuyabildi';
  exception when insufficient_privilege then null;
  end;

  -- İzin verilmeyen olay adı
  begin
    insert into public.app_events (session_id, name) values (gen_random_uuid(), 'behavior_name_smoking');
    raise exception 'TEST FAILED: izin verilmeyen olay adı kabul edildi';
  exception when check_violation then null;
  end;

  -- Büyük içerik (ör. serbest metin) kabul edilmez
  begin
    insert into public.app_events (session_id, name, props)
    values (gen_random_uuid(), 'urge_step', jsonb_build_object('note', repeat('x', 2000)));
    raise exception 'TEST FAILED: büyük props kabul edildi';
  exception when check_violation then null;
  end;

  -- Silemez, değiştiremez
  begin
    delete from public.app_events;
    raise exception 'TEST FAILED: kullanıcı silebildi';
  exception when insufficient_privilege then null;
  end;

  -- Temizleme fonksiyonunu çağıramaz
  begin
    perform public.prune_app_events();
    raise exception 'TEST FAILED: kullanıcı temizleme fonksiyonunu çağırdı';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Giriş yapmamış kullanıcı yazamaz
reset role;
set local role anon;
do $$ begin
  begin
    insert into public.app_events (session_id, name) values (gen_random_uuid(), 'app_opened');
    raise exception 'TEST FAILED: anon yazabildi';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Hesap silinse de olaylar kalır ama kimseye bağlı değildir (user_id sütunu yok)
reset role;
do $$ begin
  assert (select count(*) from public.app_events where props->>'step' = 'intensity') = 1, 'olay yazılmış olmalı';
  assert not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_events' and column_name like '%user%'
  ), 'app_events kullanıcı kimliği tutmamalı';
  -- Yönetici temizliği eski olayları siler
  update public.app_events set created_at = now() - interval '200 days';
  assert public.prune_app_events() = 1, '180 günden eski olay silinmeli';
end $$;

select 'ÜRÜN ÖLÇÜMÜ TESTLERİ GEÇTİ' as sonuc;
rollback;
