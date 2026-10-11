-- PAUSE · Migration 003 testi: dürtü akışı tabloları ve izolasyon
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'a3@test.local'),
  ('bbbbbbbb-1111-0000-0000-000000000002', 'b3@test.local');

set local role authenticated;

-- ---------- A: tam bir dürtü olayı (brief'in uçtan uca senaryosu) ----------
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1111-0000-0000-000000000001', true);

insert into public.behaviors (id, template_key, name) values ('a1000000-0000-0000-0000-0000000000b1', 'social_media', 'Sosyal medya');
insert into public.options (id, kind, label) values ('a1000000-0000-0000-0000-0000000000c1', 'trigger', 'Toplantı sonrası');

insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday, urge_before,
                                pause_minutes, pause_started_at, pause_ends_at, pause_status, source)
values ('a1000000-0000-0000-0000-0000000000e1', 'a1000000-0000-0000-0000-0000000000b1',
        current_date, 14, 3, 8, 10, now(), now() + interval '10 minutes', 'active', 'live');

insert into public.event_emotions (event_id, option_id)
select 'a1000000-0000-0000-0000-0000000000e1', id from public.options where user_id is null and kind = 'emotion' and key = 'overwhelmed';
insert into public.event_triggers (event_id, option_id)
select 'a1000000-0000-0000-0000-0000000000e1', id from public.options where user_id is null and kind = 'trigger' and key = 'work';
insert into public.event_triggers (event_id, option_id)
values ('a1000000-0000-0000-0000-0000000000e1', 'a1000000-0000-0000-0000-0000000000c1');
insert into public.event_interventions (id, event_id, option_id, position, completed, ended_at)
select 'a1000000-0000-0000-0000-0000000000f1', 'a1000000-0000-0000-0000-0000000000e1', id, 0, true, now()
from public.options where user_id is null and kind = 'intervention' and key = 'change_place';
insert into public.event_answers (event_id, question_key, value_num)
values ('a1000000-0000-0000-0000-0000000000e1', 'physical_hunger', 3);

-- Offline kuyruğu aynı alternatifi ikinci kez gönderirse tek kayıt kalmalı (upsert)
insert into public.event_interventions (id, event_id, option_id, position, completed)
select 'a1000000-0000-0000-0000-0000000000f1', 'a1000000-0000-0000-0000-0000000000e1', id, 0, true
from public.options where user_id is null and kind = 'intervention' and key = 'change_place'
on conflict (id) do update set completed = excluded.completed;

update public.urge_events set urge_after = 4, remeasured_at = now(), pause_status = 'completed', pause_completed_at = now(),
  outcome_option_id = (select id from public.options where user_id is null and kind = 'outcome' and key = 'not_done')
where id = 'a1000000-0000-0000-0000-0000000000e1';

do $$ begin
  -- Yanlış tür: duygu tablosuna tetikleyici yazılamaz
  begin
    insert into public.event_emotions (event_id, option_id)
    values ('a1000000-0000-0000-0000-0000000000e1', 'a1000000-0000-0000-0000-0000000000c1');
    raise exception 'TEST FAILED: duygu tablosuna tetikleyici yazıldı';
  exception when insufficient_privilege then null;
  end;

  assert (select urge_change from public.urge_events where id = 'a1000000-0000-0000-0000-0000000000e1') = -4, '8 -> 4 = -4 olmalı';
  assert (select count(*) from public.event_triggers) = 2, 'A 2 tetikleyici görmeli';
  assert (select count(*) from public.event_interventions) = 1, 'upsert tek kayıt bırakmalı';
end $$;

-- ---------- B: saldırgan ----------
select set_config('request.jwt.claim.sub', 'bbbbbbbb-1111-0000-0000-000000000002', true);

insert into public.behaviors (id, name) values ('b1000000-0000-0000-0000-0000000000b2', 'Sigara');
insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday, urge_before)
values ('b1000000-0000-0000-0000-0000000000e2', 'b1000000-0000-0000-0000-0000000000b2', current_date, 9, 2, 6);

do $$
declare n int;
begin
  assert (select count(*) from public.event_emotions) = 0, 'B, A''nın duygularını görüyor';
  assert (select count(*) from public.event_triggers) = 0, 'B, A''nın tetikleyicilerini görüyor';
  assert (select count(*) from public.event_interventions) = 0, 'B, A''nın alternatiflerini görüyor';
  assert (select count(*) from public.event_answers) = 0, 'B, A''nın cevaplarını görüyor';

  delete from public.event_triggers where event_id = 'a1000000-0000-0000-0000-0000000000e1';
  get diagnostics n = row_count; assert n = 0, 'B, A''nın tetikleyicisini sildi';
  update public.event_interventions set completed = false where id = 'a1000000-0000-0000-0000-0000000000f1';
  get diagnostics n = row_count; assert n = 0, 'B, A''nın alternatifini değiştirdi';

  -- A'nın olayına satır eklemek (kendi user_id'siyle): bileşik FK reddeder
  begin
    insert into public.event_emotions (event_id, option_id)
    select 'a1000000-0000-0000-0000-0000000000e1', id from public.options where user_id is null and kind = 'emotion' limit 1;
    raise exception 'TEST FAILED: B, A''nın olayına duygu ekledi';
  exception when foreign_key_violation then null;
  end;

  -- A'nın olayına A adına satır eklemek: RLS reddeder
  begin
    insert into public.event_answers (event_id, question_key, value_num, user_id)
    values ('a1000000-0000-0000-0000-0000000000e1', 'x', 1, 'aaaaaaaa-1111-0000-0000-000000000001');
    raise exception 'TEST FAILED: B, A adına cevap ekledi';
  exception when insufficient_privilege then null;
  end;

  -- Kendi olayında A'nın özel seçeneğini kullanmak: reddedilmeli
  begin
    insert into public.event_triggers (event_id, option_id)
    values ('b1000000-0000-0000-0000-0000000000e2', 'a1000000-0000-0000-0000-0000000000c1');
    raise exception 'TEST FAILED: B, A''nın seçeneğini kullandı';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------- Olay silinince bağlı kayıtlar da gitmeli ----------
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1111-0000-0000-000000000001', true);
delete from public.urge_events where id = 'a1000000-0000-0000-0000-0000000000e1';
do $$ begin
  assert (select count(*) from public.event_triggers) = 0, 'olay silinince tetikleyiciler kalmamalı';
  assert (select count(*) from public.event_interventions) = 0, 'olay silinince alternatifler kalmamalı';
end $$;

reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.event_emotions limit 1;
    raise exception 'TEST FAILED: anon event_emotions okuyabiliyor';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'DÜRTÜ AKIŞI TESTLERİ GEÇTİ' as sonuc;
rollback;
