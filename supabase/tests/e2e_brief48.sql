-- PAUSE · Brief bölüm 48: İLK END-TO-END TEST (veritabanı tarafı)
-- Senaryo: Sosyal medya · dürtü 8 · Bunalmış · İş → PAUSE (10 dk) → Ortam değiştir
--          → 10 dk dolar → yeniden ölçüm 4 → sonuç: davranışı yapmadım
-- Beklenen: 8→4 kaydedilir, Geçmiş'te görünür, analizlere dahil olur, başka kullanıcı göremez.
-- (Uygulamayı kapatıp açınca zamanlayıcının doğru kalması telefonda denenir; bkz. test listesi.)
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-4848-0000-0000-000000000001', 'a48@test.local'),
  ('bbbbbbbb-4848-0000-0000-000000000002', 'b48@test.local');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-4848-0000-0000-000000000001', true);

insert into public.behaviors (id, template_key, name, pause_minutes)
values ('a4848000-0000-0000-0000-0000000000b1', 'social_media', 'Sosyal medya', 10);

-- 1) DÜRTÜ GELDİ: şiddet 8, pause 10 dk başlar (cihaz kimliği üretir, sunucu saklar)
insert into public.urge_events (id, behavior_id, occurred_at, local_date, local_hour, local_weekday,
                                urge_before, pause_minutes, pause_started_at, pause_ends_at, pause_status, source)
values ('a4848000-0000-0000-0000-0000000000e1', 'a4848000-0000-0000-0000-0000000000b1',
        '2026-10-20 18:00+00', '2026-10-20', 21, 2,
        8, 10, '2026-10-20 18:00+00', '2026-10-20 18:10+00', 'active', 'live');

-- 2) Pause sırasında: duygu Bunalmış, tetikleyici İş
insert into public.event_emotions (event_id, option_id)
values ('a4848000-0000-0000-0000-0000000000e1', (select id from public.options where user_id is null and kind = 'emotion' and key = 'overwhelmed'));
insert into public.event_triggers (event_id, option_id)
values ('a4848000-0000-0000-0000-0000000000e1', (select id from public.options where user_id is null and kind = 'trigger' and key = 'work'));

-- 3) Alternatif: Ortam değiştir
insert into public.event_interventions (event_id, option_id, position, started_at, ended_at, completed)
values ('a4848000-0000-0000-0000-0000000000e1',
        (select id from public.options where user_id is null and kind = 'intervention' and key = 'change_place'),
        0, '2026-10-20 18:01+00', '2026-10-20 18:04+00', true);

-- 4) Uygulama kapatılıp açılınca kalan süre sunucudaki pause_ends_at'ten hesaplanır
do $$ begin
  assert (select pause_ends_at - pause_started_at from public.urge_events where id = 'a4848000-0000-0000-0000-0000000000e1')
         = interval '10 minutes', 'zamanlayıcı sunucuda saklı (10 dk)';
  assert (select pause_status from public.urge_events where id = 'a4848000-0000-0000-0000-0000000000e1') = 'active', 'pause sürüyor';
end $$;

-- 5) 10 dk dolar, yeniden ölçüm 4, sonuç: davranışı yapmadım
update public.urge_events
set urge_after = 4, remeasured_at = '2026-10-20 18:10+00',
    pause_status = 'completed', pause_completed_at = '2026-10-20 18:10+00',
    outcome_option_id = (select id from public.options where user_id is null and kind = 'outcome' and key = 'not_done')
where id = 'a4848000-0000-0000-0000-0000000000e1';

do $$
declare
  e record;
  ins jsonb := public.get_insights();
  tl  jsonb := public.get_timeline(p_today => '2026-10-24');
  tb  jsonb := public.get_toolbox();
  cp  jsonb := (select x from jsonb_array_elements(tb) x where x->>'key' = 'change_place');
begin
  select * into e from public.urge_events where id = 'a4848000-0000-0000-0000-0000000000e1';
  -- 8→4 kaydedilmeli
  assert e.urge_before = 8 and e.urge_after = 4 and e.urge_change = -4, '8→4 (değişim −4)';
  assert e.outcome_class = 'not_done', 'sonuç sınıfı otomatik dolar';
  -- Geçmiş'e eklenmeli (Geçmiş ekranı urge_events'i kendi RLS'iyle okur)
  assert (select count(*) from public.urge_events where deleted_at is null) = 1, 'Geçmiş''te 1 kayıt';
  -- Analizlere dahil edilmeli
  assert (ins->'totals'->>'urges')::int = 1 and (ins->'totals'->>'avg_change')::numeric = -4.0
         and (ins->'totals'->>'not_done')::int = 1, 'içgörü toplamları: ' || (ins->'totals')::text;
  assert (ins->'interventions'->0->>'key') = 'change_place' and (ins->'interventions'->0->>'avg_change')::numeric = -4.0, 'alternatif etkisi';
  assert jsonb_array_length(ins->'pairs') = 1 and (ins->'pairs'->0->>'avg_change')::numeric = -4.0, 'İş × Ortam değiştir eşleşmesi';
  assert (ins->'hours'->>21)::int = 1 and (ins->'weekdays'->>1)::int = 1, 'saat ve gün (yerel)';
  assert (tl->>'total')::int = 1 and tl->'events'->0->>'outcome' = 'not_done' and (tl->'events'->0->>'change')::int = -4, 'Yolun''da adım';
  assert (cp->>'uses')::int = 1 and (cp->>'avg_change')::numeric = -4.0, 'araç kutusunda';
  assert (public.get_savings()->0->>'not_done')::int = 1, 'tasarruf sayımı';
  assert (select (value)::text <> 'null' from jsonb_each(public.get_milestones()) where key = 'first_alternative'), 'ilk alternatif taşı';
end $$;

-- 6) Başka kullanıcı hesabı bunu görememeli
select set_config('request.jwt.claim.sub', 'bbbbbbbb-4848-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from public.urge_events) = 0, 'B kaydı görmez';
  assert (select count(*) from public.event_emotions) + (select count(*) from public.event_triggers)
       + (select count(*) from public.event_interventions) = 0, 'B ayrıntıları görmez';
  assert (public.get_insights()->'totals'->>'urges')::int = 0, 'B''nin içgörüsünde yok';
  assert (public.get_timeline()->>'total')::int = 0, 'B''nin yolunda yok';
  assert (select bool_and((x->>'uses')::int = 0) from jsonb_array_elements(public.get_toolbox()) x), 'B''nin araç kutusunda yok';
  update public.urge_events set urge_after = 10;  -- etkisiz olmalı
  delete from public.urge_events;                 -- etkisiz olmalı
end $$;

reset role;
do $$ begin
  assert (select urge_after from public.urge_events where id = 'a4848000-0000-0000-0000-0000000000e1') = 4, 'B değiştiremedi/silemedi';
end $$;

select 'BRIEF 48 UÇTAN UCA TESTİ GEÇTİ' as sonuc;
rollback;
