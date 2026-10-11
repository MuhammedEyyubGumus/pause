-- =====================================================================
-- PAUSE · "Süre doldu" bildirim zamanlayıcısı
-- Supabase panelinde SQL Editor'a yapıştır, İKİ yeri doldur, Run.
-- Tekrar tekrar çalıştırılabilir; her seferinde temiz kurulum yapar.
--
-- Önce panelden eklentileri aç: Database > Extensions > pg_cron ve pg_net.
-- Doldurduğun hali git'e KOYMA (gizli değer içerir). Bu şablon güvenle commit'lenebilir.
-- =====================================================================

-- 1) Eklentiler (zaten açıksa bir şey yapmaz)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 2) Eski kayıtları temizle
delete from vault.secrets where name in ('project_url', 'pause_cron_secret');

-- 3) Değerleri kaydet: vault.create_secret(DEĞER, AD)
--    DEĞER 1: Project Settings > API > Project URL  (sonunda /rest/v1/ ve / OLMADAN)
select vault.create_secret('https://PROJE_REF.supabase.co', 'project_url');
--    DEĞER 2: "npx supabase secrets set ... CRON_SECRET=..." komutunda verdiğin değerin aynısı
select vault.create_secret('CRON_SECRET_DEGERI', 'pause_cron_secret');

-- 4) Zamanlayıcıyı (yeniden) kur
select cron.unschedule(jobid) from cron.job where jobname = 'pause-notify';

select cron.schedule(
  'pause-notify',
  '30 seconds',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/notify-pause-ends',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'pause_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);

-- 5) Kontrol
select
  (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') as project_url,
  (select count(*) from vault.decrypted_secrets where name = 'pause_cron_secret')   as cron_secret_var, -- 1
  (select count(*) from cron.job where jobname = 'pause-notify')                     as zamanlayici;     -- 1

-- 1 dakika sonra: fonksiyonun cevabı (200 olmalı)
-- select status_code, content, created from net._http_response order by created desc limit 3;

-- Durdurmak istersen:
-- select cron.unschedule('pause-notify');
