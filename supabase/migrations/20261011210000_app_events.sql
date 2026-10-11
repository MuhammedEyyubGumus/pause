-- PAUSE · Migration 008: Ürün ölçümü (brief bölüm 41)
-- Kişisel davranış verisinden tamamen ayrı, anonim kullanım olayları:
-- onboarding tamamlama, dürtü akışında hangi adımda çıkıldığı, pause tamamlama,
-- alternatif kullanım oranı, içgörü ekranının açılması gibi.
--
-- Anonimlik:
--  * user_id YOK. Olaylar yalnızca uygulama her açıldığında yeniden üretilen
--    rastgele bir oturum kimliğiyle gruplanır; oturumlar birbirine ya da bir
--    hesaba bağlanamaz.
--  * Serbest metin, davranış adı, duygu/tetikleyici etiketi gönderilmez.
--    Yalnızca izin verilen olay adları ve küçük, teknik özellikler (adım adı, mod).
--  * Kullanıcılar okuyamaz; yalnızca proje sahibi (SQL Editor / service_role) bakar.

create table public.app_events (
  id          bigint generated always as identity primary key,
  session_id  uuid not null,
  name        text not null check (name in (
                'app_opened',
                'onboarding_step', 'onboarding_completed',
                'urge_flow_started', 'urge_step', 'pause_completed', 'urge_flow_completed',
                'intervention_started', 'intervention_completed',
                'review_started', 'review_completed',
                'insights_viewed', 'weekly_review_opened',
                'feedback_sent', 'push_enabled'
              )),
  props       jsonb not null default '{}'::jsonb
                check (jsonb_typeof(props) = 'object' and pg_column_size(props) <= 512),
  app_version text check (char_length(app_version) <= 64),
  created_at  timestamptz not null default now()
);

create index app_events_name_created_idx on public.app_events (name, created_at desc);
create index app_events_session_idx on public.app_events (session_id, created_at);

alter table public.app_events enable row level security;

-- Giriş yapmış herkes olay yazabilir; kimse (service_role dışında) okuyamaz.
create policy "app_events: insert" on public.app_events
  for insert to authenticated with check (true);

revoke all on public.app_events from anon, authenticated;
grant insert on public.app_events to authenticated;

-- 180 günden eski olayları temizle (isteğe bağlı: pg_cron ile günlük çalıştırılabilir)
create or replace function public.prune_app_events()
returns integer
language sql
security definer
set search_path = ''
as $$
  with d as (delete from public.app_events where created_at < now() - interval '180 days' returning 1)
  select count(*)::int from d;
$$;

revoke all on function public.prune_app_events() from public, anon, authenticated;
