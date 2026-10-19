-- PAUSE · Migration 016 testi: "Yolun" zaman çizelgesi
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-1616-0000-0000-000000000001', 'a16@test.local'),
  ('bbbbbbbb-1616-0000-0000-000000000002', 'b16@test.local');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1616-0000-0000-000000000001', true);

do $$ declare r jsonb := public.get_timeline(p_today => '2026-10-21');
begin
  assert (r->>'total')::int = 0 and r->'events' = '[]'::jsonb, 'boş kullanıcı';
  assert jsonb_array_length(r->'weeks') = 12 and jsonb_array_length(r->'heat') = 7, 'boşken de 12 hafta, 7 gün';
  assert (r->'weeks'->11->>'start') = '2026-10-19', 'son hafta bu haftanın pazartesisi';
  assert (r->'weeks'->0->>'start') = '2026-08-03', 'ilk hafta 11 hafta önce';
end $$;

insert into public.behaviors (id, template_key, name) values
  ('a1616000-0000-0000-0000-0000000000b1', 'smoking', 'Sigara'),
  ('a1616000-0000-0000-0000-0000000000b2', 'gaming', 'Oyun');

-- Bu hafta (Pzt 19 Ekim, saat 22): 2 olay; geçen hafta (Çar 14 Ekim, saat 9): 1 olay; diğer davranışta 1 olay; 1 silinmiş
insert into public.urge_events (id, behavior_id, occurred_at, local_date, local_hour, local_weekday,
                                urge_before, urge_after, pause_minutes, pause_started_at, pause_ends_at, pause_status,
                                outcome_option_id, source, deleted_at)
values
  ('a1616000-0000-0000-0000-0000000000e1', 'a1616000-0000-0000-0000-0000000000b1', '2026-10-14 06:00+00', '2026-10-14', 9, 3,
   8, 4, 10, '2026-10-14 06:00+00', '2026-10-14 06:10+00', 'completed',
   (select id from public.options where user_id is null and kind = 'outcome' and key = 'not_done'), 'live', null),
  ('a1616000-0000-0000-0000-0000000000e2', 'a1616000-0000-0000-0000-0000000000b1', '2026-10-19 19:00+00', '2026-10-19', 22, 1,
   7, 7, null, null, null, 'none',
   (select id from public.options where user_id is null and kind = 'outcome' and key = 'occurred'), 'live', null),
  ('a1616000-0000-0000-0000-0000000000e3', 'a1616000-0000-0000-0000-0000000000b1', '2026-10-19 19:30+00', '2026-10-19', 22, 1,
   9, null, null, null, null, 'none', null, 'live', null),
  ('a1616000-0000-0000-0000-0000000000e4', 'a1616000-0000-0000-0000-0000000000b2', '2026-10-18 10:00+00', '2026-10-18', 13, 7,
   5, 3, null, null, null, 'none',
   (select id from public.options where user_id is null and kind = 'outcome' and key = 'stopped_early'), 'live', null),
  ('a1616000-0000-0000-0000-0000000000e5', 'a1616000-0000-0000-0000-0000000000b1', '2026-10-19 20:00+00', '2026-10-19', 23, 1,
   6, null, null, null, null, 'none', null, 'live', now());

-- Nefes ilk kez e1'de, sonra e2'de; müzik ilk kez e2'de
insert into public.event_interventions (event_id, option_id, position, started_at) values
  ('a1616000-0000-0000-0000-0000000000e1', (select id from public.options where user_id is null and kind = 'intervention' and key = 'breathe'), 0, '2026-10-14 06:01+00'),
  ('a1616000-0000-0000-0000-0000000000e2', (select id from public.options where user_id is null and kind = 'intervention' and key = 'breathe'), 0, '2026-10-19 19:01+00'),
  ('a1616000-0000-0000-0000-0000000000e2', (select id from public.options where user_id is null and kind = 'intervention' and key = 'music'), 1, '2026-10-19 19:05+00');

do $$
declare
  r jsonb := public.get_timeline(p_today => '2026-10-21');
  s jsonb := public.get_timeline('a1616000-0000-0000-0000-0000000000b1', '2026-10-21');
  e jsonb := r->'events';
begin
  assert (r->>'total')::int = 4, 'silinmiş hariç 4: ' || (r->>'total');
  assert jsonb_array_length(e) = 4 and e->0->>'id' = 'a1616000-0000-0000-0000-0000000000e1'
         and e->3->>'id' = 'a1616000-0000-0000-0000-0000000000e3', 'eskiden yeniye sıralı';
  assert (e->0->>'paused')::boolean and e->0->>'outcome' = 'not_done' and (e->0->>'change')::int = -4, 'ilk adım';
  assert jsonb_array_length(e->0->'new_tools') = 1, 'nefes ilk kez e1''de';
  assert e->2->>'id' = 'a1616000-0000-0000-0000-0000000000e2' and jsonb_array_length(e->2->'new_tools') = 1
         and e->2->'new_tools'->>0 = (select id::text from public.options where user_id is null and kind = 'intervention' and key = 'music'),
         'e2''de yalnızca müzik yeni';
  assert e->3->'outcome' = 'null'::jsonb and e->3->'change' = 'null'::jsonb, 'açık kayıt';

  assert (r->'weeks'->11->>'urges')::int = 2 and (r->'weeks'->11->>'avg_before')::numeric = 8.0
         and (r->'weeks'->11->>'occurred')::int = 1, 'bu hafta: ' || (r->'weeks'->11)::text;
  assert (r->'weeks'->10->>'urges')::int = 2 and (r->'weeks'->10->>'kept')::int = 1 and (r->'weeks'->10->>'stopped')::int = 1,
         'geçen hafta (iki davranış): ' || (r->'weeks'->10)::text;
  assert (r->'weeks'->10->>'avg_after')::numeric = 3.5, 'ortalama sonra (4 ve 3)';
  assert (r->'heat'->0->>22)::int = 2 and (r->'heat'->2->>9)::int = 1 and (r->'heat'->6->>13)::int = 1, 'ısı haritası';

  assert (s->>'total')::int = 3 and (s->'weeks'->10->>'urges')::int = 1, 'davranış filtresi';
  assert jsonb_array_length(public.get_timeline(p_today => '2026-10-21', p_limit => 2)->'events') = 2, 'sınır';
  assert (public.get_timeline(p_today => '2026-10-21', p_limit => 2)->'events'->1->>'id') = 'a1616000-0000-0000-0000-0000000000e3',
         'sınırda en yeniler kalır';
  assert jsonb_array_length(public.get_timeline(p_today => '2026-10-21', p_weeks => 100)->'weeks') = 52, 'en fazla 52 hafta';
end $$;

select set_config('request.jwt.claim.sub', 'bbbbbbbb-1616-0000-0000-000000000002', true);
do $$ begin
  assert (public.get_timeline()->>'total')::int = 0, 'B, A''nın kayıtlarını görmemeli';
  assert (public.get_timeline('a1616000-0000-0000-0000-0000000000b1')->>'total')::int = 0, 'filtreyle de göremez';
end $$;

reset role;
set local role anon;
do $$ begin
  begin
    perform public.get_timeline();
    raise exception 'TEST FAILED: anon çağırdı';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'YOL TESTLERİ GEÇTİ' as sonuc;
rollback;
