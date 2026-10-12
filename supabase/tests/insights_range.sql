-- PAUSE · Migration 009 testi: içgörülerde tarih aralığı (haftalık hikâye)
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values ('aaaaaaaa-9999-0000-0000-000000000001', 'a9@test.local');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-9999-0000-0000-000000000001', true);

insert into public.behaviors (id, template_key, name) values ('a9000000-0000-0000-0000-0000000000b1', 'smoking', 'Sigara');

-- 2026-10-05 (Pzt) .. 2026-10-11 (Paz) haftası: 3 olay; önceki hafta: 2 olay; sonraki gün: 1 olay
insert into public.urge_events (behavior_id, local_date, local_hour, local_weekday, urge_before, source)
values
  ('a9000000-0000-0000-0000-0000000000b1', '2026-10-05', 9, 1, 6, 'live'),
  ('a9000000-0000-0000-0000-0000000000b1', '2026-10-06', 9, 2, 7, 'live'),
  ('a9000000-0000-0000-0000-0000000000b1', '2026-10-11', 9, 7, 8, 'live'),
  ('a9000000-0000-0000-0000-0000000000b1', '2026-09-29', 9, 2, 9, 'live'),
  ('a9000000-0000-0000-0000-0000000000b1', '2026-10-04', 9, 7, 9, 'live'),
  ('a9000000-0000-0000-0000-0000000000b1', '2026-10-12', 9, 1, 2, 'live');

do $$ begin
  assert (public.get_insights(p_from => '2026-10-05', p_to => '2026-10-11')->'totals'->>'urges')::int = 3, 'hafta: 3 (iki uç dahil)';
  assert (public.get_insights(p_from => '2026-09-28', p_to => '2026-10-04')->'totals'->>'urges')::int = 2, 'önceki hafta: 2';
  assert (public.get_insights(p_from => '2026-10-05')->'totals'->>'urges')::int = 4, 'yalnızca başlangıç: 4';
  assert (public.get_insights()->'totals'->>'urges')::int = 6, 'tümü: 6';
  assert (public.get_insights(p_behavior => 'a9000000-0000-0000-0000-0000000000b1')->'totals'->>'urges')::int = 6, 'isimli davranış parametresi';
  assert (public.get_insights(p_from => '2026-10-05', p_to => '2026-10-11')->'weekdays'->>6)::int = 1, 'Pazar 1';
end $$;

reset role;
select 'İÇGÖRÜ ARALIK TESTLERİ GEÇTİ' as sonuc;
rollback;
