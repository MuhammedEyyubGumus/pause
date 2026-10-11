-- =====================================================================
-- PAUSE · Migration 004 · "Süre doldu" bildirimleri (Web Push)
-- 1. push_subscriptions: kullanıcının bildirim izni verdiği tarayıcılar
-- 2. urge_events.pause_notified_at: aynı pause için iki kez bildirim gitmesin
-- 3. claim_due_pause_notifications(): süresi dolan pause'ları atomik olarak
--    "bildirildi" işaretleyip döndürür. Yalnızca sunucu (service_role) çağırabilir.
-- =====================================================================

alter table public.urge_events add column pause_notified_at timestamptz;

create table public.push_subscriptions (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint        text not null check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh          text not null check (char_length(p256dh) between 80 and 100),
  auth            text not null check (char_length(auth) between 16 and 30),
  locale          text not null default 'tr' check (locale in ('tr', 'en', 'ar', 'ku')),
  user_agent      text check (char_length(user_agent) <= 300),
  created_at      timestamptz not null default now(),
  last_success_at timestamptz,
  primary key (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: kendi aboneliklerini oku" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "push_subscriptions: yalnızca kendi adına ekle" on public.push_subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "push_subscriptions: kendi aboneliğini güncelle" on public.push_subscriptions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "push_subscriptions: kendi aboneliğini sil" on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.push_subscriptions from anon;

-- Süresi dolan, henüz yeniden ölçülmemiş ve bildirilmemiş pause'lar.
-- 15 dakikadan eski olanlara bildirim gönderilmez (geç gelen bildirim kafa karıştırır).
create or replace function public.claim_due_pause_notifications()
returns table (event_id uuid, user_id uuid)
language sql
security definer
set search_path = ''
as $$
  update public.urge_events e
     set pause_notified_at = now()
   where e.pause_status = 'active'
     and e.remeasured_at is null
     and e.pause_notified_at is null
     and e.deleted_at is null
     and e.pause_ends_at <= now()
     and e.pause_ends_at > now() - interval '15 minutes'
  returning e.id, e.user_id;
$$;

revoke all on function public.claim_due_pause_notifications() from public, anon, authenticated;
grant execute on function public.claim_due_pause_notifications() to service_role;
