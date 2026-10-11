-- PAUSE · Migration 007: Davranış zinciri incelemesi (brief bölüm 17–18)
-- Davranış gerçekleştiğinde (ya da başlayıp erken durulduğunda) kullanıcı
-- zinciri adım adım inceler, zinciri nerede kesebileceğini işaretler ve
-- "bir dahaki sefere" için bir alternatif seçer. Olay başına tek inceleme.

create type public.chain_step as enum (
  'trigger', 'thought', 'emotion', 'urge', 'first_action', 'control_shift', 'outcome'
);

create table public.reflections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event_id         uuid not null,

  thought          text check (char_length(thought) <= 280),       -- O an aklından geçen
  first_action     text check (char_length(first_action) <= 280),  -- Zincirdeki ilk küçük adım
  duration_minutes smallint check (duration_minutes between 0 and 1440), -- Episode süresi
  cut_point        public.chain_step,                              -- "Zinciri nerede kesebilirdim?"
  next_option_id   uuid references public.options (id) on delete set null, -- "Bir dahaki sefere"

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- İnceleme yalnızca aynı kullanıcının olayına bağlanabilir; olay silinince gider
  foreign key (event_id, user_id) references public.urge_events (id, user_id) on delete cascade,
  -- (user_id, event_id): başka birinin olayının incelemesi olup olmadığı sızmasın
  constraint reflections_event_uq unique (user_id, event_id)
);

create index reflections_user_created_idx on public.reflections (user_id, created_at desc);

create trigger reflections_updated_at
  before update on public.reflections
  for each row execute function public.set_updated_at();

alter table public.reflections enable row level security;

create policy "reflections: select own" on public.reflections
  for select to authenticated using ((select auth.uid()) = user_id);
-- "Bir dahaki sefere" yalnızca kullanıcının görebildiği bir alternatif olabilir
create policy "reflections: insert own" on public.reflections
  for insert to authenticated
  with check ((select auth.uid()) = user_id
              and (next_option_id is null or public.option_usable(next_option_id, 'intervention')));
create policy "reflections: update own" on public.reflections
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id
              and (next_option_id is null or public.option_usable(next_option_id, 'intervention')));
create policy "reflections: delete own" on public.reflections
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.reflections from anon;
grant select, insert, update, delete on public.reflections to authenticated;
