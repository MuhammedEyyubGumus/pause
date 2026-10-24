-- PAUSE · Migration 017 testi: yapay zekâ analizi izni ve kayıtları
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-1717-0000-0000-000000000001', 'a17@test.local'),
  ('bbbbbbbb-1717-0000-0000-000000000002', 'b17@test.local');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1717-0000-0000-000000000001', true);

do $$ begin
  -- İzin yokken kayıt eklenemez
  begin
    insert into public.ai_analyses (period, facts, body, source) values ('30', '{}', 'x', 'template');
    raise exception 'TEST FAILED: izinsiz analiz kaydedildi';
  exception when insufficient_privilege then null;
  end;
end $$;

update public.profiles set ai_consent_at = now() where id = 'aaaaaaaa-1717-0000-0000-000000000001';
insert into public.ai_analyses (period, facts, body, source, model) values ('30', '{"urges":12}', 'Yorum', 'ai', 'claude-haiku-4-5');
insert into public.behaviors (id, template_key, name) values ('a1717000-0000-0000-0000-0000000000b1', 'smoking', 'Sigara');
insert into public.ai_analyses (period, behavior_id, facts, body, source) values ('7', 'a1717000-0000-0000-0000-0000000000b1', '{}', 'Şablon', 'template');

do $$ begin
  assert (select count(*) from public.ai_analyses) = 2, 'A kendi analizlerini görür';
  begin
    insert into public.ai_analyses (period, facts, body, source) values ('365', '{}', 'x', 'ai');
    raise exception 'TEST FAILED: geçersiz dönem';
  exception when check_violation then null;
  end;
  begin
    insert into public.ai_analyses (period, facts, body, source) values ('30', '{}', 'x', 'magic');
    raise exception 'TEST FAILED: geçersiz kaynak';
  exception when check_violation then null;
  end;
end $$;

-- B: A'nın analizlerini göremez, A adına ekleyemez, A'nın davranışına bağlayamaz
select set_config('request.jwt.claim.sub', 'bbbbbbbb-1717-0000-0000-000000000002', true);
update public.profiles set ai_consent_at = now() where id = 'bbbbbbbb-1717-0000-0000-000000000002';
do $$ begin
  assert (select count(*) from public.ai_analyses) = 0, 'B, A''nın analizlerini görmemeli';
  begin
    insert into public.ai_analyses (user_id, period, facts, body, source)
    values ('aaaaaaaa-1717-0000-0000-000000000001', '30', '{}', 'x', 'ai');
    raise exception 'TEST FAILED: B, A adına ekledi';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.ai_analyses (period, behavior_id, facts, body, source)
    values ('30', 'a1717000-0000-0000-0000-0000000000b1', '{}', 'x', 'ai');
    raise exception 'TEST FAILED: B, A''nın davranışına bağladı';
  exception when foreign_key_violation then null;
  end;
  delete from public.ai_analyses;  -- etkisiz olmalı
end $$;

-- İzni geri çeken A artık yeni kayıt ekleyemez; davranış silinince analizi de silinir
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1717-0000-0000-000000000001', true);
do $$ begin
  assert (select count(*) from public.ai_analyses) = 2, 'B silemedi';
end $$;
update public.profiles set ai_consent_at = null where id = 'aaaaaaaa-1717-0000-0000-000000000001';
do $$ begin
  begin
    insert into public.ai_analyses (period, facts, body, source) values ('30', '{}', 'x', 'ai');
    raise exception 'TEST FAILED: izin geri çekildikten sonra kaydedildi';
  exception when insufficient_privilege then null;
  end;
end $$;
delete from public.behaviors where id = 'a1717000-0000-0000-0000-0000000000b1';
do $$ begin
  assert (select count(*) from public.ai_analyses) = 1, 'davranışla birlikte analizi silindi';
end $$;

reset role;
set local role anon;
do $$ begin
  assert (select count(*) from public.ai_analyses) = 0;
exception when insufficient_privilege then null;
end $$;

reset role;
select 'YAPAY ZEKÂ ANALİZİ TESTLERİ GEÇTİ' as sonuc;
rollback;
