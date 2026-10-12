-- PAUSE · Migration 010 testi: haftalık deney
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-1010-0000-0000-000000000001', 'a10@test.local'),
  ('bbbbbbbb-1010-0000-0000-000000000002', 'b10@test.local');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1010-0000-0000-000000000001', true);

insert into public.behaviors (id, template_key, name) values
  ('a1010000-0000-0000-0000-0000000000b1', 'social_media', 'Sosyal medya'),
  ('a1010000-0000-0000-0000-0000000000b2', 'smoking', 'Sigara');

create temp table ids as
select
  (select id from public.options where user_id is null and kind = 'trigger' and key = 'work') as work,
  (select id from public.options where user_id is null and kind = 'trigger' and key = 'fatigue') as fatigue,
  (select id from public.options where user_id is null and kind = 'intervention' and key = 'change_place') as place,
  (select id from public.options where user_id is null and kind = 'intervention' and key = 'breathe') as breathe;
grant select on ids to authenticated;

-- Deney: sosyal medya, iş, dürtü ≥ 7 → ortam değiştir; 2026-10-12 .. 2026-10-18
select public.start_experiment((select place from ids), (select work from ids),
                               'a1010000-0000-0000-0000-0000000000b1', 7::smallint, '2026-10-12');

-- Olaylar (e1..e7)
insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday, urge_before, urge_after, source) values
  ('a1010000-0000-0000-0000-0000000000e1', 'a1010000-0000-0000-0000-0000000000b1', '2026-10-12', 18, 1, 8, 4, 'live'), -- fırsat, uygulandı -4
  ('a1010000-0000-0000-0000-0000000000e2', 'a1010000-0000-0000-0000-0000000000b1', '2026-10-13', 18, 2, 9, 7, 'live'), -- fırsat, uygulandı -2
  ('a1010000-0000-0000-0000-0000000000e3', 'a1010000-0000-0000-0000-0000000000b1', '2026-10-14', 18, 3, 7, 7, 'live'), -- fırsat, nefes (uygulanmadı) 0
  ('a1010000-0000-0000-0000-0000000000e4', 'a1010000-0000-0000-0000-0000000000b1', '2026-10-15', 18, 4, 5, 3, 'live'), -- eşik altı
  ('a1010000-0000-0000-0000-0000000000e5', 'a1010000-0000-0000-0000-0000000000b1', '2026-10-15', 19, 4, 8, 6, 'live'), -- yorgunluk: tetikleyici uymuyor
  ('a1010000-0000-0000-0000-0000000000e6', 'a1010000-0000-0000-0000-0000000000b2', '2026-10-15', 20, 4, 9, 2, 'live'), -- başka davranış
  ('a1010000-0000-0000-0000-0000000000e7', 'a1010000-0000-0000-0000-0000000000b1', '2026-10-20', 18, 2, 9, 1, 'live'); -- dönem dışı

insert into public.event_triggers (event_id, option_id)
select e, (select work from ids) from unnest(array[
  'a1010000-0000-0000-0000-0000000000e1', 'a1010000-0000-0000-0000-0000000000e2', 'a1010000-0000-0000-0000-0000000000e3',
  'a1010000-0000-0000-0000-0000000000e4', 'a1010000-0000-0000-0000-0000000000e6', 'a1010000-0000-0000-0000-0000000000e7']::uuid[]) e;
insert into public.event_triggers (event_id, option_id) values ('a1010000-0000-0000-0000-0000000000e5', (select fatigue from ids));

insert into public.event_interventions (event_id, option_id, position, completed) values
  ('a1010000-0000-0000-0000-0000000000e1', (select place from ids), 0, true),
  ('a1010000-0000-0000-0000-0000000000e2', (select place from ids), 0, true),
  ('a1010000-0000-0000-0000-0000000000e3', (select breathe from ids), 0, true),
  ('a1010000-0000-0000-0000-0000000000e6', (select place from ids), 0, true);

do $$
declare
  x uuid := (select id from public.experiments where status = 'active');
  r jsonb := public.experiment_results(x);
begin
  assert (r->>'opportunities')::int = 3, 'fırsat 3 olmalı: ' || r::text;
  assert (r->>'applied')::int = 2, 'uygulanan 2';
  assert (r->>'applied_avg')::numeric = -3, 'uygulandığında -3';
  assert (r->>'other_avg')::numeric = 0, 'uygulanmadığında 0';

  -- Yeni deney başlatınca öncekisi kapanır; aynı anda tek aktif
  perform public.start_experiment((select breathe from ids), null, null, 0::smallint, '2026-10-14');
  assert (select count(*) from public.experiments where status = 'active') = 1, 'tek aktif deney';
  assert (select status from public.experiments where id = x) = 'abandoned', 'süresi dolmadan değişen: vazgeçildi';

  -- İkinci aktif deney doğrudan eklenemez
  begin
    insert into public.experiments (intervention_option_id, starts_on, ends_on)
    values ((select place from ids), '2026-10-14', '2026-10-20');
    raise exception 'TEST FAILED: ikinci aktif deney eklendi';
  exception when unique_violation then null;
  end;

  -- Alternatif olmayan bir seçenek deneyin alternatifi olamaz
  begin
    update public.experiments set intervention_option_id = (select work from ids) where status = 'active';
    raise exception 'TEST FAILED: tetikleyici alternatif olarak kaydedildi';
  exception when insufficient_privilege then null;
  end;

  -- Süresi dolmuş deneyin yerine yenisi: tamamlandı
  perform public.start_experiment((select place from ids), null, null, 0::smallint, '2026-10-30');
  assert (select count(*) from public.experiments where status = 'completed') = 1, 'süresi dolan: tamamlandı';
end $$;

-- B, A'nın deneyini göremez, sonucunu hesaplatamaz
select set_config('request.jwt.claim.sub', 'bbbbbbbb-1010-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from public.experiments) = 0, 'B A''nın deneylerini görmemeli';
  assert public.experiment_results((select id from public.experiments limit 1)) is null, 'B sonucu görmemeli';
  assert public.experiment_results('a1010000-0000-0000-0000-000000000000') is null, 'olmayan deney: null';
  update public.experiments set status = 'abandoned';
  delete from public.experiments;
  -- B, A'nın davranışına deney bağlayamaz
  begin
    insert into public.experiments (behavior_id, intervention_option_id, starts_on, ends_on)
    values ('a1010000-0000-0000-0000-0000000000b1', (select place from ids), current_date, current_date + 6);
    raise exception 'TEST FAILED: B, A''nın davranışına deney bağladı';
  exception when foreign_key_violation then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-1010-0000-0000-000000000001', true);
do $$ begin
  assert (select count(*) from public.experiments) = 3, 'A''nın 3 deneyi durmalı';
end $$;

reset role;
set local role anon;
do $$ begin
  begin
    perform public.start_experiment(gen_random_uuid());
    raise exception 'TEST FAILED: anon deney başlattı';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'DENEY TESTLERİ GEÇTİ' as sonuc;
rollback;
