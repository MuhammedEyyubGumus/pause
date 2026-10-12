-- PAUSE · Migration 011 testi: öğrenme kilometre taşları
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-1111-1111-0000-000000000001', 'a11@test.local'),
  ('bbbbbbbb-1111-1111-0000-000000000002', 'b11@test.local');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1111-1111-0000-000000000001', true);

do $$
declare r jsonb := public.get_milestones();
begin
  assert (select count(*) from jsonb_each(r)) = 8, '8 taş anahtarı olmalı';
  assert (select bool_and(value = 'null'::jsonb) from jsonb_each(r)), 'yeni kullanıcıda hiçbiri kazanılmamış olmalı';
end $$;

insert into public.behaviors (id, template_key, name) values ('a1111000-0000-0000-0000-0000000000b1', 'smoking', 'Sigara');

-- 10 olay; 6'sı pause'u tamamlanmış ve ölçülmüş, hepsinde nefes; biri erken durdurulmuş
insert into public.urge_events (id, behavior_id, occurred_at, local_date, local_hour, local_weekday, urge_before, urge_after,
                                pause_minutes, pause_started_at, pause_ends_at, pause_status, remeasured_at, source, outcome_option_id)
select ('a1111000-0000-0000-0000-00000000e0' || lpad(g::text, 2, '0'))::uuid,
       'a1111000-0000-0000-0000-0000000000b1',
       timestamptz '2026-10-01 10:00+00' + (g || ' hours')::interval,
       '2026-10-01', 10, 4, 8,
       case when g <= 6 then 5 end,
       10, timestamptz '2026-10-01 10:00+00' + (g || ' hours')::interval,
       timestamptz '2026-10-01 10:10+00' + (g || ' hours')::interval,
       case when g <= 6 then 'completed'::public.pause_status else 'none'::public.pause_status end,
       case when g <= 6 then timestamptz '2026-10-01 10:10+00' + (g || ' hours')::interval end,
       'live',
       case when g = 3 then (select id from public.options where user_id is null and kind = 'outcome' and key = 'stopped_early') end
from generate_series(1, 10) g;

insert into public.event_interventions (event_id, option_id, position, completed, started_at, ended_at)
select e.id, (select id from public.options where user_id is null and kind = 'intervention' and key = 'breathe'), 0,
       true, e.occurred_at + interval '1 minute', e.occurred_at + interval '5 minutes'
from public.urge_events e where e.pause_status = 'completed';

do $$
declare r jsonb := public.get_milestones();
begin
  assert (r->>'first_urge')::timestamptz = '2026-10-01 11:00+00', 'ilk dürtü';
  assert (r->>'first_pause')::timestamptz = '2026-10-01 11:10+00', 'ilk tamamlanan pause';
  assert (r->>'first_alternative')::timestamptz = '2026-10-01 11:05+00', 'ilk alternatif';
  assert (r->>'first_stopped_early')::timestamptz = '2026-10-01 13:00+00', 'ilk erken durma';
  assert (r->>'ten_events')::timestamptz = '2026-10-01 20:00+00', '10. olay';
  assert (r->>'first_pattern')::timestamptz = '2026-10-01 15:00+00', 'nefesin 5. ölçümü: ilk örüntü';
  assert r->'first_review' = 'null'::jsonb and r->'first_experiment' = 'null'::jsonb, 'henüz inceleme/deney yok';
end $$;

-- Kutlanan taşlar profilde saklanır
update public.profiles set celebrated_milestones = array['first_urge', 'first_pause']
where id = 'aaaaaaaa-1111-1111-0000-000000000001';

-- B, A'nın taşlarını görmez ve A'nın profilini değiştiremez
select set_config('request.jwt.claim.sub', 'bbbbbbbb-1111-1111-0000-000000000002', true);
do $$ begin
  assert public.get_milestones()->'first_urge' = 'null'::jsonb, 'B, A''nın taşlarını görmemeli';
  update public.profiles set celebrated_milestones = '{}' where id = 'aaaaaaaa-1111-1111-0000-000000000001';
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-1111-1111-0000-000000000001', true);
do $$ begin
  assert (select cardinality(celebrated_milestones) from public.profiles
          where id = 'aaaaaaaa-1111-1111-0000-000000000001') = 2, 'B değiştirememeli';
end $$;

reset role;
set local role anon;
do $$ begin
  begin
    perform public.get_milestones();
    raise exception 'TEST FAILED: anon çağırabildi';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'KİLOMETRE TAŞI TESTLERİ GEÇTİ' as sonuc;
rollback;
