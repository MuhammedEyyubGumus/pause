-- =====================================================================
-- PAUSE · Migration 001 · Temel tablolar (Phase 1)
-- profiles, behaviors, options, urge_events + RLS + sistem seçenekleri
-- =====================================================================
-- Güvenlik ilkeleri:
--   1. Her tabloda RLS açık; politikalar yalnızca "authenticated" rolüne.
--   2. user_id istemciden gelmez: varsayılanı auth.uid(); politikalar
--      with check ile başka kullanıcı adına yazmayı engeller.
--   3. Bileşik yabancı anahtarlar (id, user_id) sayesinde bir kullanıcı
--      başkasının davranışına olay bağlayamaz.
--   4. Sistem seçenekleri (user_id null) herkes için salt okunur.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enum tipleri
-- ---------------------------------------------------------------------
create type public.behavior_goal  as enum ('reduce', 'mindful', 'quit', 'custom');
create type public.option_kind    as enum ('emotion', 'trigger', 'intervention', 'outcome');
create type public.outcome_class  as enum ('not_done', 'alternative', 'stopped_early', 'occurred', 'undecided');
create type public.pause_status   as enum ('none', 'active', 'completed', 'abandoned');
create type public.event_source   as enum ('live', 'sos', 'retro');

-- ---------------------------------------------------------------------
-- Yardımcı: updated_at otomatik güncelleme
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =====================================================================
-- 1. PROFILES
-- =====================================================================
create table public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  display_name             text check (char_length(display_name) <= 60),
  locale                   text not null default 'tr' check (locale in ('tr', 'en', 'ar', 'ku')),
  timezone                 text not null default 'Europe/Istanbul',
  default_pause_minutes    smallint not null default 10 check (default_pause_minutes in (2, 5, 10, 15)),
  onboarding_completed_at  timestamptz,
  consents                 jsonb not null default '{}'::jsonb,  -- {"health_data": "2026-10-07T...", "product_analytics": false}
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Yeni kullanıcı kaydolduğunda profil satırını otomatik oluştur
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles: kendi profilini oku"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: kendi profilini güncelle"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
-- insert: yalnızca handle_new_user tetikleyicisi (security definer) yapar.
-- delete: auth.users silinince cascade ile gider.

-- =====================================================================
-- 2. BEHAVIORS
-- =====================================================================
create table public.behaviors (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_key   text,                       -- 'smoking', 'social_media' ... null = tamamen özel
  name           text not null check (char_length(name) between 1 and 40),
  icon           text not null default 'circle',
  goal           public.behavior_goal not null default 'reduce',
  goal_text      text check (char_length(goal_text) <= 140),
  why            text check (char_length(why) <= 280),
  pause_minutes  smallint not null default 10 check (pause_minutes in (2, 5, 10, 15)),
  is_active      boolean not null default true,
  archived_at    timestamptz,
  sort_order     smallint not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- urge_events ve options'ın bileşik FK'sı için
  unique (id, user_id)
);

create index behaviors_user_idx on public.behaviors (user_id, sort_order);

create trigger behaviors_updated_at
  before update on public.behaviors
  for each row execute function public.set_updated_at();

alter table public.behaviors enable row level security;

create policy "behaviors: kendi davranışlarını oku"
  on public.behaviors for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "behaviors: yalnızca kendi adına ekle"
  on public.behaviors for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "behaviors: kendi davranışını güncelle"
  on public.behaviors for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "behaviors: kendi davranışını sil"
  on public.behaviors for delete to authenticated
  using ((select auth.uid()) = user_id);

-- =====================================================================
-- 3. OPTIONS  (duygu / tetikleyici / alternatif / sonuç kataloğu)
-- =====================================================================
-- user_id null  -> sistem seçeneği; etiketi kodda i18n ile 'key' üzerinden
-- user_id dolu  -> kullanıcının kendi eklediği seçenek; 'label' zorunlu
-- behavior_id dolu -> yalnızca o davranışta gösterilir
-- behavior_template_key dolu (sistem) -> yalnızca o şablondaki davranışlarda
create table public.options (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid default auth.uid() references auth.users (id) on delete cascade,
  behavior_id            uuid,
  behavior_template_key  text,
  kind                   public.option_kind not null,
  key                    text,
  label                  text check (char_length(label) <= 40),
  icon                   text,
  outcome_class          public.outcome_class,
  sort_order             smallint not null default 100,
  is_archived            boolean not null default false,
  created_at             timestamptz not null default now(),

  -- Davranışa özel seçenek, aynı kullanıcının davranışına bağlanmalı
  foreign key (behavior_id, user_id) references public.behaviors (id, user_id) on delete cascade,

  -- Sistem seçeneğinin key'i olmalı; kullanıcı seçeneğinin label'ı olmalı
  constraint options_system_has_key  check (user_id is not null or key is not null),
  constraint options_custom_has_label check (user_id is null or label is not null),
  -- Sonuç seçenekleri mutlaka kanonik sınıfa bağlı; diğerleri bağlanmaz
  constraint options_outcome_class check (
    (kind = 'outcome' and outcome_class is not null) or
    (kind <> 'outcome' and outcome_class is null)
  )
);

create unique index options_system_key_uq
  on public.options (kind, key, coalesce(behavior_template_key, ''))
  where user_id is null;

create index options_user_idx on public.options (user_id, kind) where user_id is not null;

alter table public.options enable row level security;

create policy "options: sistem + kendi seçeneklerini oku"
  on public.options for select to authenticated
  using (user_id is null or (select auth.uid()) = user_id);

create policy "options: yalnızca kendi adına ekle"
  on public.options for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "options: kendi seçeneğini güncelle"
  on public.options for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "options: kendi seçeneğini sil"
  on public.options for delete to authenticated
  using ((select auth.uid()) = user_id);

-- =====================================================================
-- 4. URGE_EVENTS  (uygulamanın kalbi)
-- =====================================================================
create table public.urge_events (
  -- Kimlik cihazda üretilir: offline kuyruk aynı olayı iki kez gönderse
  -- bile upsert tek kayıt oluşturur.
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  behavior_id         uuid not null,

  occurred_at         timestamptz not null default now(),
  -- Kayıt anındaki yerel zaman (seyahatte analiz kaymasın)
  local_date          date not null,
  local_hour          smallint not null check (local_hour between 0 and 23),
  local_weekday       smallint not null check (local_weekday between 1 and 7),  -- ISO: 1 = Pazartesi

  urge_before         smallint check (urge_before between 0 and 10),
  urge_after          smallint check (urge_after between 0 and 10),
  urge_change         smallint generated always as (urge_after - urge_before) stored,

  pause_minutes       smallint check (pause_minutes in (2, 5, 10, 15)),
  pause_started_at    timestamptz,
  pause_ends_at       timestamptz,
  pause_completed_at  timestamptz,
  pause_status        public.pause_status not null default 'none',
  remeasured_at       timestamptz,

  outcome_option_id   uuid references public.options (id) on delete set null,
  outcome_class       public.outcome_class,

  emergency_mode      boolean not null default false,
  source              public.event_source not null default 'live',
  entry_ms            integer check (entry_ms >= 0),   -- DÜRTÜ GELDİ -> pause başlangıcı süresi
  notes               text check (char_length(notes) <= 1000),

  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Olay yalnızca aynı kullanıcının davranışına bağlanabilir
  foreign key (behavior_id, user_id) references public.behaviors (id, user_id) on delete cascade,

  constraint urge_events_pause_window check (
    pause_started_at is null or
    (pause_ends_at is not null and pause_ends_at > pause_started_at)
  ),
  constraint urge_events_active_has_window check (
    pause_status not in ('active', 'completed') or pause_started_at is not null
  )
);

create index urge_events_user_behavior_time_idx
  on public.urge_events (user_id, behavior_id, occurred_at desc)
  where deleted_at is null;

-- Uygulama açılışında "aktif pause var mı?" sorgusu için
create index urge_events_active_pause_idx
  on public.urge_events (user_id)
  where pause_status = 'active';

-- Bildirim cron'u için: süresi dolan aktif pause'lar
create index urge_events_pause_due_idx
  on public.urge_events (pause_ends_at)
  where pause_status = 'active';

create trigger urge_events_updated_at
  before update on public.urge_events
  for each row execute function public.set_updated_at();

-- Sonuç seçeneği seçildiğinde kanonik sınıfı otomatik doldur
create or replace function public.sync_outcome_class()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.outcome_option_id is not null then
    select o.outcome_class into new.outcome_class
    from public.options o
    where o.id = new.outcome_option_id;
  end if;
  return new;
end;
$$;

create trigger urge_events_outcome_class
  before insert or update of outcome_option_id on public.urge_events
  for each row execute function public.sync_outcome_class();

alter table public.urge_events enable row level security;

create policy "urge_events: kendi olaylarını oku"
  on public.urge_events for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "urge_events: yalnızca kendi adına ekle"
  on public.urge_events for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      outcome_option_id is null
      or exists (
        select 1 from public.options o
        where o.id = outcome_option_id
          and o.kind = 'outcome'
          and (o.user_id is null or o.user_id = (select auth.uid()))
      )
    )
  );

create policy "urge_events: kendi olayını güncelle"
  on public.urge_events for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      outcome_option_id is null
      or exists (
        select 1 from public.options o
        where o.id = outcome_option_id
          and o.kind = 'outcome'
          and (o.user_id is null or o.user_id = (select auth.uid()))
      )
    )
  );

create policy "urge_events: kendi olayını sil"
  on public.urge_events for delete to authenticated
  using ((select auth.uid()) = user_id);

-- =====================================================================
-- 5. Anonim role hiçbir tabloya erişim yok
-- =====================================================================
revoke all on public.profiles, public.behaviors, public.options, public.urge_events from anon;

-- =====================================================================
-- 6. SİSTEM SEÇENEKLERİ (etiketler kodda: messages/tr.json -> options.<kind>.<key>)
-- =====================================================================
insert into public.options (user_id, kind, key, icon, sort_order) values
  -- Duygular
  (null, 'emotion', 'anxious',      'anxious',     10),
  (null, 'emotion', 'overwhelmed',  'overwhelmed', 20),
  (null, 'emotion', 'sad',          'sad',         30),
  (null, 'emotion', 'angry',        'angry',       40),
  (null, 'emotion', 'tired',        'tired',       50),
  (null, 'emotion', 'bored',        'bored',       60),
  (null, 'emotion', 'empty',        'empty',       70),
  (null, 'emotion', 'ok_but_urge',  'ok',          80),
  -- Tetikleyiciler
  (null, 'trigger', 'work',         'briefcase',   10),
  (null, 'trigger', 'family',       'house',       20),
  (null, 'trigger', 'relationship', 'heart',       30),
  (null, 'trigger', 'social',       'users',       40),
  (null, 'trigger', 'thoughts',     'brain',       50),
  (null, 'trigger', 'fatigue',      'moon',        60),
  (null, 'trigger', 'cue',          'eye',         70),
  (null, 'trigger', 'place',        'map-pin',     80),
  (null, 'trigger', 'stress',       'wave',        90),
  (null, 'trigger', 'unknown',      'question',   100),
  -- Alternatifler
  (null, 'intervention', 'change_place',       'door',      10),
  (null, 'intervention', 'breathe',            'wind',      20),
  (null, 'intervention', 'move',               'walk',      30),
  (null, 'intervention', 'reach_out',          'phone',     40),
  (null, 'intervention', 'music',              'headphones',50),
  (null, 'intervention', 'relax_muscles',      'hand',      60),
  (null, 'intervention', 'urge_surf',          'waves',     70),
  (null, 'intervention', 'now_later_delegate', 'stack',     80),
  (null, 'intervention', 'just_wait',          'hourglass', 90);

insert into public.options (user_id, kind, key, icon, outcome_class, sort_order) values
  (null, 'outcome', 'not_done',        'circle-check', 'not_done',      10),
  (null, 'outcome', 'different_choice','arrows-split', 'alternative',   20),
  (null, 'outcome', 'stopped_early',   'hand-stop',    'stopped_early', 30),
  (null, 'outcome', 'occurred',        'dot',          'occurred',      40),
  (null, 'outcome', 'undecided',       'clock',        'undecided',     50);
