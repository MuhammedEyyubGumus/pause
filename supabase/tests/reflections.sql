-- PAUSE · Migration 007 testi: davranış zinciri incelemesi ve izolasyon
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-7777-0000-0000-000000000001', 'a7@test.local'),
  ('bbbbbbbb-7777-0000-0000-000000000002', 'b7@test.local');

set local role authenticated;

-- ---------- A: davranış gerçekleşmiş bir olay ve incelemesi ----------
select set_config('request.jwt.claim.sub', 'aaaaaaaa-7777-0000-0000-000000000001', true);

insert into public.behaviors (id, template_key, name) values ('a7000000-0000-0000-0000-0000000000b1', 'social_media', 'Sosyal medya');
insert into public.options (id, kind, label) values ('a7000000-0000-0000-0000-0000000000c1', 'intervention', 'Telefonu çekmeceye koy');
insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday, urge_before, source)
values ('a7000000-0000-0000-0000-0000000000e1', 'a7000000-0000-0000-0000-0000000000b1', current_date, 22, 3, 8, 'live');

insert into public.reflections (event_id, thought, first_action, duration_minutes, cut_point, next_option_id)
values ('a7000000-0000-0000-0000-0000000000e1', 'Sadece bir bakacağım', 'Telefonu elime aldım', 45, 'first_action',
        'a7000000-0000-0000-0000-0000000000c1');

-- Aynı olaya ikinci inceleme yazılmaz; upsert günceller
insert into public.reflections (event_id, cut_point, next_option_id)
values ('a7000000-0000-0000-0000-0000000000e1', 'thought',
        (select id from public.options where user_id is null and kind = 'intervention' and key = 'change_place'))
on conflict (user_id, event_id) do update set cut_point = excluded.cut_point, next_option_id = excluded.next_option_id;

do $$ begin
  assert (select count(*) from public.reflections) = 1, 'olay başına tek inceleme';
  assert (select cut_point from public.reflections) = 'thought', 'upsert güncellemeli';
  assert (select thought from public.reflections) = 'Sadece bir bakacağım', 'upsert diğer alanları korumalı';

  -- Alternatif olmayan bir seçenek "bir dahaki sefere" olamaz
  begin
    update public.reflections set next_option_id =
      (select id from public.options where user_id is null and kind = 'trigger' and key = 'work');
    raise exception 'TEST FAILED: tetikleyici, alternatif olarak kaydedildi';
  exception when insufficient_privilege then null;
  end;

  -- Süre sınırı
  begin
    update public.reflections set duration_minutes = 5000;
    raise exception 'TEST FAILED: geçersiz süre kabul edildi';
  exception when check_violation then null;
  end;
end $$;

-- ---------- B: saldırgan ----------
select set_config('request.jwt.claim.sub', 'bbbbbbbb-7777-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from public.reflections) = 0, 'B A''nın incelemesini görmemeli';

  update public.reflections set thought = 'hack';
  delete from public.reflections;

  -- B, A'nın olayına inceleme bağlayamaz
  begin
    insert into public.reflections (event_id) values ('a7000000-0000-0000-0000-0000000000e1');
    raise exception 'TEST FAILED: B, A''nın olayına inceleme ekledi';
  exception when foreign_key_violation or insufficient_privilege then null;
  end;

  -- B, A'nın kendi alternatifini kullanamaz
  insert into public.behaviors (id, template_key, name) values ('b7000000-0000-0000-0000-0000000000b1', 'gaming', 'Oyun');
  insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday, source)
  values ('b7000000-0000-0000-0000-0000000000e1', 'b7000000-0000-0000-0000-0000000000b1', current_date, 10, 3, 'live');
  begin
    insert into public.reflections (event_id, next_option_id)
    values ('b7000000-0000-0000-0000-0000000000e1', 'a7000000-0000-0000-0000-0000000000c1');
    raise exception 'TEST FAILED: B, A''nın alternatifini kullandı';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-7777-0000-0000-000000000001', true);
do $$ begin
  assert (select thought from public.reflections) = 'Sadece bir bakacağım', 'B değiştirememeli';
  -- Olay silinince incelemesi de gider
  delete from public.urge_events where id = 'a7000000-0000-0000-0000-0000000000e1';
  assert (select count(*) from public.reflections) = 0, 'olayla birlikte silinmeli';
end $$;

-- Giriş yapmamış kullanıcı okuyamaz
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.reflections;
    raise exception 'TEST FAILED: anon okuyabildi';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'İNCELEME TESTLERİ GEÇTİ' as sonuc;
rollback;
