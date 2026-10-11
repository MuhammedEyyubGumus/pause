-- PAUSE · Migration 006 testi: içgörü hesapları ve izolasyon
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-6666-0000-0000-000000000001', 'a6@test.local'),
  ('bbbbbbbb-6666-0000-0000-000000000002', 'b6@test.local');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-6666-0000-0000-000000000001', true);

insert into public.behaviors (id, template_key, name) values
  ('a6000000-0000-0000-0000-0000000000b1', 'smoking', 'Sigara'),
  ('a6000000-0000-0000-0000-0000000000b2', 'alcohol', 'Alkol');

-- 6 olay: 5'i iş + ortam değiştirme (8 -> 5, değişim -3), 1'i ölçülmemiş, akşam 18'de, Salı
insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday, urge_before, urge_after,
                                pause_minutes, pause_started_at, pause_ends_at, pause_status, source, outcome_option_id)
select ('a6000000-0000-0000-0000-00000000e00' || g)::uuid, 'a6000000-0000-0000-0000-0000000000b1',
       current_date - g, 18, 2, 8, case when g <= 5 then 5 end,
       10, now(), now() + interval '10 minutes', 'completed', 'live',
       (select id from public.options where user_id is null and kind = 'outcome'
          and key = case when g = 1 then 'occurred' when g = 2 then 'stopped_early' else 'not_done' end)
from generate_series(1, 6) g;

-- Eski bir olay (60 gün önce), başka davranış, pause yok, sabah 9, Pazartesi
insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday, urge_before, source)
values ('a6000000-0000-0000-0000-0000000000e9', 'a6000000-0000-0000-0000-0000000000b2', current_date - 60, 9, 1, 4, 'retro');

-- Silinmiş olay hiçbir yerde sayılmamalı
insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday, urge_before, deleted_at)
values ('a6000000-0000-0000-0000-0000000000ea', 'a6000000-0000-0000-0000-0000000000b1', current_date, 3, 7, 10, now());

insert into public.event_triggers (event_id, option_id)
select e.id, o.id from public.urge_events e, public.options o
where e.behavior_id = 'a6000000-0000-0000-0000-0000000000b1' and o.user_id is null and o.kind = 'trigger' and o.key = 'work';

-- Aynı olayda aynı alternatif iki kez: tek sayılmalı
insert into public.event_interventions (event_id, option_id, position, completed)
select e.id, o.id, p, true from public.urge_events e, public.options o, generate_series(0, 1) p
where e.behavior_id = 'a6000000-0000-0000-0000-0000000000b1' and e.deleted_at is null
  and o.user_id is null and o.kind = 'intervention' and o.key = 'change_place';

insert into public.event_emotions (event_id, option_id)
select e.id, o.id from public.urge_events e, public.options o
where e.id = 'a6000000-0000-0000-0000-00000000e001' and o.user_id is null and o.kind = 'emotion' and o.key = 'overwhelmed';

do $$
declare
  r jsonb;
begin
  -- Tüm zamanlar
  r := public.get_insights();
  assert (r->'totals'->>'urges')::int = 7, 'toplam 7 olay (silinmiş hariç): ' || (r->'totals'->>'urges');
  assert (r->'totals'->>'paused')::int = 6, 'pause kullanılan 6';
  assert (r->'totals'->>'measured')::int = 5, 'ölçülen 5';
  assert (r->'totals'->>'avg_change')::numeric = -3, 'ortalama değişim -3';
  assert (r->'totals'->>'with_outcome')::int = 6, 'sonuçlu 6';
  assert (r->'totals'->>'occurred')::int = 1 and (r->'totals'->>'stopped_early')::int = 1
     and (r->'totals'->>'not_done')::int = 4, 'sonuç sınıfları';
  assert jsonb_array_length(r->'hours') = 24 and (r->'hours'->>18)::int = 6 and (r->'hours'->>9)::int = 1
     and (r->'hours'->>3)::int = 0, 'saat dağılımı';
  assert jsonb_array_length(r->'weekdays') = 7 and (r->'weekdays'->>1)::int = 6 and (r->'weekdays'->>0)::int = 1, 'gün dağılımı';
  assert r->'triggers'->0->>'key' = 'work' and (r->'triggers'->0->>'n')::int = 6
     and (r->'triggers'->0->>'avg_before')::numeric = 8, 'tetikleyici: iş 6 kez, ort. 8';
  assert (r->'interventions'->0->>'uses')::int = 6 and (r->'interventions'->0->>'n')::int = 5
     and (r->'interventions'->0->>'avg_change')::numeric = -3, 'alternatif tekrarları tek sayılmalı';
  assert jsonb_array_length(r->'pairs') = 1 and (r->'pairs'->0->>'n')::int = 5, 'iş × ortam değiştirme 5 ölçüm';
  assert (r->'emotions'->0->>'n')::int = 1, 'duygu';

  -- Son 30 gün: 60 gün önceki olay dışarıda
  r := public.get_insights(current_date - 29);
  assert (r->'totals'->>'urges')::int = 6, '30 gün: 6';

  -- Davranış filtresi
  r := public.get_insights(null, 'a6000000-0000-0000-0000-0000000000b2');
  assert (r->'totals'->>'urges')::int = 1 and jsonb_array_length(r->'triggers') = 0, 'alkol: 1 olay, tetikleyicisiz';

  -- Hiç kayıt yoksa da geçerli bir yapı döner
  r := public.get_insights(current_date + 1);
  assert (r->'totals'->>'urges')::int = 0 and r->'totals'->'avg_change' = 'null'::jsonb
     and r->'interventions' = '[]'::jsonb and (r->'hours'->>0)::int = 0, 'boş dönem';
end $$;

-- B, A'nın verisini göremez
select set_config('request.jwt.claim.sub', 'bbbbbbbb-6666-0000-0000-000000000002', true);
do $$ begin
  assert (public.get_insights()->'totals'->>'urges')::int = 0, 'B A''nın olaylarını görmemeli';
  -- B, A'nın davranış kimliğini verse bile bir şey göremez
  assert (public.get_insights(null, 'a6000000-0000-0000-0000-0000000000b1')->'totals'->>'urges')::int = 0, 'B filtreyle de göremez';
end $$;

-- Giriş yapmamış kullanıcı çağıramaz
reset role;
set local role anon;
do $$ begin
  begin
    perform public.get_insights();
    raise exception 'TEST FAILED: anon çağırabildi';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'İÇGÖRÜ TESTLERİ GEÇTİ' as sonuc;
rollback;
