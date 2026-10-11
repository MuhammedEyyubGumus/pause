-- =====================================================================
-- PAUSE · Migration 003 · Dürtü akışı
-- Bir dürtü olayının çoklu seçimleri ve denenen alternatifleri:
--   event_emotions, event_triggers, event_interventions, event_answers
-- Kurallar:
--   * Her satır yalnızca aynı kullanıcının olayına bağlanabilir (bileşik FK)
--   * Seçenek ya sistem seçeneği ya da kullanıcının kendi seçeneği olmalı
--     ve doğru türde olmalı (ör. duygu tablosuna tetikleyici yazılamaz)
-- =====================================================================

-- Bileşik FK için
alter table public.urge_events add constraint urge_events_id_user_uq unique (id, user_id);

-- Seçenek bu kullanıcı için kullanılabilir mi ve doğru türde mi?
-- security invoker: options tablosunun RLS'i de ayrıca uygulanır.
create or replace function public.option_usable(p_option_id uuid, p_kind public.option_kind)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.options o
    where o.id = p_option_id
      and o.kind = p_kind
      and (o.user_id is null or o.user_id = (select auth.uid()))
  );
$$;

-- ---------------------------------------------------------------------
-- Duygular (çoklu seçim)
-- ---------------------------------------------------------------------
create table public.event_emotions (
  event_id   uuid not null,
  option_id  uuid not null references public.options (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, option_id),
  foreign key (event_id, user_id) references public.urge_events (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------
-- Tetikleyiciler (çoklu seçim)
-- ---------------------------------------------------------------------
create table public.event_triggers (
  event_id   uuid not null,
  option_id  uuid not null references public.options (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, option_id),
  foreign key (event_id, user_id) references public.urge_events (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------
-- Denenen alternatifler (bir pause'da birden fazla; ilk sıradaki "birincil")
-- ---------------------------------------------------------------------
create table public.event_interventions (
  id          uuid primary key default gen_random_uuid(),  -- cihazda üretilir
  event_id    uuid not null,
  option_id   uuid not null references public.options (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position    smallint not null default 0 check (position between 0 and 20),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  completed   boolean not null default false,
  details     jsonb not null default '{}'::jsonb,  -- ör. Şimdi/Sonra/Devret listesi
  created_at  timestamptz not null default now(),
  foreign key (event_id, user_id) references public.urge_events (id, user_id) on delete cascade,
  constraint event_interventions_window check (ended_at is null or ended_at >= started_at)
);

create index event_interventions_event_idx on public.event_interventions (event_id, position);
create index event_interventions_user_option_idx on public.event_interventions (user_id, option_id);

-- ---------------------------------------------------------------------
-- Davranışa özel sorular (ör. yemede fiziksel açlık). Soru tanımları kodda.
-- ---------------------------------------------------------------------
create table public.event_answers (
  event_id     uuid not null,
  question_key text not null check (question_key ~ '^[a-z0-9_]{1,40}$'),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  value_num    smallint check (value_num between 0 and 10),
  value_text   text check (char_length(value_text) <= 280),
  created_at   timestamptz not null default now(),
  primary key (event_id, question_key),
  foreign key (event_id, user_id) references public.urge_events (id, user_id) on delete cascade,
  constraint event_answers_has_value check (value_num is not null or value_text is not null)
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.event_emotions      enable row level security;
alter table public.event_triggers      enable row level security;
alter table public.event_interventions enable row level security;
alter table public.event_answers       enable row level security;

-- event_emotions
create policy "event_emotions: kendi kayıtlarını oku" on public.event_emotions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "event_emotions: yalnızca kendi adına ekle" on public.event_emotions
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.option_usable(option_id, 'emotion'));
create policy "event_emotions: kendi kaydını sil" on public.event_emotions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- event_triggers
create policy "event_triggers: kendi kayıtlarını oku" on public.event_triggers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "event_triggers: yalnızca kendi adına ekle" on public.event_triggers
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.option_usable(option_id, 'trigger'));
create policy "event_triggers: kendi kaydını sil" on public.event_triggers
  for delete to authenticated using ((select auth.uid()) = user_id);

-- event_interventions
create policy "event_interventions: kendi kayıtlarını oku" on public.event_interventions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "event_interventions: yalnızca kendi adına ekle" on public.event_interventions
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.option_usable(option_id, 'intervention'));
create policy "event_interventions: kendi kaydını güncelle" on public.event_interventions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.option_usable(option_id, 'intervention'));
create policy "event_interventions: kendi kaydını sil" on public.event_interventions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- event_answers
create policy "event_answers: kendi kayıtlarını oku" on public.event_answers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "event_answers: yalnızca kendi adına ekle" on public.event_answers
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "event_answers: kendi kaydını güncelle" on public.event_answers
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "event_answers: kendi kaydını sil" on public.event_answers
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.event_emotions, public.event_triggers, public.event_interventions, public.event_answers from anon;
