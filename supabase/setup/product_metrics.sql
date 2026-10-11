-- PAUSE · Ürün ölçümü sorguları (brief bölüm 41)
-- Supabase > SQL Editor'da çalıştır. Yalnızca anonim app_events tablosunu okur;
-- kişisel davranış verisine dokunmaz. Varsayılan dönem: son 14 gün.

-- 1) Onboarding: hangi ekrana kaç oturum ulaştı, kaçı tamamladı
with s as (
  select session_id, props->>'step' as step
  from public.app_events
  where name = 'onboarding_step' and created_at > now() - interval '14 days'
)
select step, count(distinct session_id) as oturum
from s group by step
union all
select 'TAMAMLANDI', count(distinct session_id)
from public.app_events
where name = 'onboarding_completed' and created_at > now() - interval '14 days'
order by oturum desc;

-- 2) Dürtü akışı: başlatılan / pause tamamlanan / sonucu girilen
select
  count(distinct session_id) filter (where name = 'urge_flow_started')   as akis_baslayan_oturum,
  count(*) filter (where name = 'urge_flow_started')                     as akis_baslatma,
  count(*) filter (where name = 'pause_completed')                       as pause_tamamlanan,
  count(*) filter (where name = 'urge_flow_completed')                   as sonuc_girilen,
  count(*) filter (where name = 'intervention_started')                  as alternatif_baslatma,
  count(*) filter (where name = 'intervention_completed' and props->>'completed' = 'true') as alternatif_bitirme
from public.app_events
where created_at > now() - interval '14 days';

-- 3) Akış hangi adımda yarıda kalıyor: tamamlanmayan oturumlarda görülen SON adım
with steps as (
  select session_id, props->>'step' as step, created_at,
         row_number() over (partition by session_id order by created_at desc) as rn
  from public.app_events
  where name = 'urge_step' and created_at > now() - interval '14 days'
),
done as (
  select distinct session_id from public.app_events
  where name = 'urge_flow_completed' and created_at > now() - interval '14 days'
)
select step as son_adim, count(*) as yarida_kalan_oturum
from steps
where rn = 1 and session_id not in (select session_id from done)
group by step
order by yarida_kalan_oturum desc;

-- 4) En çok başlatılan alternatifler ve bitirilme oranı
select props->>'key' as alternatif,
       count(*) filter (where name = 'intervention_started') as baslatma,
       round(100.0 * count(*) filter (where name = 'intervention_completed' and props->>'completed' = 'true')
             / nullif(count(*) filter (where name = 'intervention_started'), 0)) as bitirme_yuzde
from public.app_events
where name in ('intervention_started', 'intervention_completed') and created_at > now() - interval '14 days'
group by 1
order by baslatma desc;

-- 5) Ekranlar açılıyor mu: içgörüler, zincir incelemesi, geri bildirim, bildirim açma
select name, count(*) as adet, count(distinct session_id) as oturum
from public.app_events
where name in ('app_opened', 'insights_viewed', 'review_started', 'review_completed',
               'weekly_review_opened', 'feedback_sent', 'push_enabled')
  and created_at > now() - interval '14 days'
group by name
order by adet desc;

-- 6) (İsteğe bağlı) 180 günden eski olayları temizle
-- select public.prune_app_events();
