-- PAUSE · Migration 004 testi (her şey ROLLBACK ile geri alınır)
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-3333-0000-0000-000000000001', 'a5@test.local'),
  ('bbbbbbbb-3333-0000-0000-000000000002', 'b5@test.local');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-3333-0000-0000-000000000001', true);

insert into public.behaviors (id, name) values ('a3000000-0000-0000-0000-0000000000b1', 'Sigara');
insert into public.push_subscriptions (endpoint, p256dh, auth)
values ('https://fcm.googleapis.com/fcm/send/abc', repeat('A', 87), repeat('B', 22));

-- 1: süresi 1 dk önce doldu -> bildirilmeli
-- 2: süresi henüz dolmadı -> bildirilmemeli
-- 3: süresi doldu ama yeniden ölçüldü -> bildirilmemeli
-- 4: süresi 1 saat önce doldu -> çok eski, bildirilmemeli
insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday, urge_before,
                                pause_started_at, pause_ends_at, pause_status, remeasured_at)
values
  ('a3000000-0000-0000-0000-0000000000e1', 'a3000000-0000-0000-0000-0000000000b1', current_date, 9, 1, 7, now() - interval '11 minutes', now() - interval '1 minute', 'active', null),
  ('a3000000-0000-0000-0000-0000000000e2', 'a3000000-0000-0000-0000-0000000000b1', current_date, 9, 1, 7, now(), now() + interval '10 minutes', 'active', null),
  ('a3000000-0000-0000-0000-0000000000e3', 'a3000000-0000-0000-0000-0000000000b1', current_date, 9, 1, 7, now() - interval '12 minutes', now() - interval '2 minutes', 'active', now()),
  ('a3000000-0000-0000-0000-0000000000e4', 'a3000000-0000-0000-0000-0000000000b1', current_date, 9, 1, 7, now() - interval '70 minutes', now() - interval '60 minutes', 'active', null);

do $$ begin
  -- Normal kullanıcı claim fonksiyonunu çağıramaz
  begin
    perform public.claim_due_pause_notifications();
    raise exception 'TEST FAILED: authenticated claim fonksiyonunu çağırdı';
  exception when insufficient_privilege then null;
  end;
end $$;

-- B, A'nın aboneliğini göremez ve silemez
select set_config('request.jwt.claim.sub', 'bbbbbbbb-3333-0000-0000-000000000002', true);
do $$
declare n int;
begin
  assert (select count(*) from public.push_subscriptions) = 0, 'B, A''nın aboneliğini görüyor';
  delete from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/abc';
  get diagnostics n = row_count; assert n = 0, 'B, A''nın aboneliğini sildi';
end $$;

-- Sunucu (cron) çağırır
reset role;
set local role service_role;
do $$
declare ids uuid[];
begin
  select array_agg(event_id) into ids from public.claim_due_pause_notifications();
  assert ids = array['a3000000-0000-0000-0000-0000000000e1'::uuid], 'yalnızca 1 numaralı olay bildirilmeli: ' || coalesce(ids::text, 'null');
  -- İkinci çağrıda aynı olay tekrar dönmemeli
  assert (select count(*) from public.claim_due_pause_notifications()) = 0, 'aynı pause iki kez bildirildi';
end $$;

reset role;
select 'BİLDİRİM TESTLERİ GEÇTİ' as sonuc;
rollback;
