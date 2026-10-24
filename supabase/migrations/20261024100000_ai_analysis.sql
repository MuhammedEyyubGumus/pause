-- PAUSE · Migration 017: "Pattern'lerimi analiz et" (brief bölüm 29, PAUSE Intelligence)
-- * profiles.ai_consent_at: kullanıcı yapay zekâ yorumuna açıkça izin verdiğinde dolar
-- * ai_analyses: üretilen yorumlar (önbellek + günlük sınır için)
-- Yapay zekâya yalnızca sunucunun hesapladığı özet sayılar gider; notlar, isim, e-posta gitmez.

alter table public.profiles add column ai_consent_at timestamptz;

create table public.ai_analyses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period      text not null check (period in ('7', '30', '90', 'all')),
  behavior_id uuid,
  facts       jsonb not null,                         -- yorumun dayandığı sayılar (şeffaflık için saklanır)
  body        text not null check (char_length(body) <= 4000),
  source      text not null check (source in ('ai', 'template')),
  model       text check (char_length(model) <= 80),
  created_at  timestamptz not null default now(),
  -- Davranış silinirse analiz de silinir
  foreign key (behavior_id, user_id) references public.behaviors (id, user_id) on delete cascade
);

create index ai_analyses_user_time_idx on public.ai_analyses (user_id, created_at desc);

alter table public.ai_analyses enable row level security;

create policy "ai_analyses: select own" on public.ai_analyses
  for select to authenticated using ((select auth.uid()) = user_id);
-- Kayıt yalnızca izin verilmişse eklenebilir
create policy "ai_analyses: insert own" on public.ai_analyses
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.ai_consent_at is not null)
  );
create policy "ai_analyses: delete own" on public.ai_analyses
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.ai_analyses from anon;
grant select, insert, delete on public.ai_analyses to authenticated;
