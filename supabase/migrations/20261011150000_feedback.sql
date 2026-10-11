-- =====================================================================
-- PAUSE · Migration 005 · Test grubu geri bildirimi
-- 1. feedback tablosu (6 soru + "1–10 tekrar kullanır mısın?")
-- 2. İsteğe bağlı ekran görüntüleri için GİZLİ depolama klasörü
--    Her kullanıcı yalnızca kendi klasörüne (<user_id>/...) yazıp okuyabilir.
-- =====================================================================

create table public.feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  answers         jsonb not null default '{}'::jsonb
                  check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 20000),
  would_reuse     smallint check (would_reuse between 1 and 10),
  screenshot_path text check (screenshot_path is null or screenshot_path like (user_id::text || '/%')),
  app_version     text check (char_length(app_version) <= 40),
  user_agent      text check (char_length(user_agent) <= 300),
  created_at      timestamptz not null default now()
);

create index feedback_user_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

create policy "feedback: kendi geri bildirimlerini oku" on public.feedback
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "feedback: yalnızca kendi adına gönder" on public.feedback
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "feedback: kendi geri bildirimini sil" on public.feedback
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.feedback from anon;

-- ---------------------------------------------------------------------
-- Ekran görüntüleri: gizli klasör, en fazla 5 MB, yalnızca resim
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "feedback dosyaları: kendi klasörüne yükle" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "feedback dosyaları: kendi dosyalarını gör" on storage.objects
  for select to authenticated
  using (bucket_id = 'feedback' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "feedback dosyaları: kendi dosyalarını sil" on storage.objects
  for delete to authenticated
  using (bucket_id = 'feedback' and (storage.foldername(name))[1] = (select auth.uid())::text);
