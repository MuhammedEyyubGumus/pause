-- PAUSE · Migration 010: Haftalık deney (brief bölüm 26)
-- "ONE EXPERIMENT": kullanıcı bir hafta boyunca tek bir kural dener, ör.
--   İş kaynaklı dürtü ≥ 7 → Ortam değiştir → PAUSE
-- Uygulama takip eder: fırsat sayısı, uygulanan, uygulandığında / uygulanmadığında
-- ortalama dürtü değişimi. Nedensellik iddiası yoktur.
--
-- Tasarım kararı: brief'teki experiment_events tablosu yerine fırsatlar ve
-- uygulamalar mevcut kayıtlardan (urge_events + tetikleyiciler + alternatifler)
-- hesaplanır. Böylece çift kayıt tutulmaz; bir kayıt düzenlenir ya da silinirse
-- deney sonucu kendiliğinden doğru kalır.

create type public.experiment_status as enum ('active', 'completed', 'abandoned');

create table public.experiments (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  behavior_id             uuid,                       -- null: tüm davranışlar
  trigger_option_id       uuid references public.options (id) on delete set null, -- null: her tetikleyici
  intervention_option_id  uuid not null references public.options (id) on delete cascade,
  min_urge                smallint not null default 0 check (min_urge between 0 and 10),
  starts_on               date not null,
  ends_on                 date not null,
  status                  public.experiment_status not null default 'active',
  ended_at                timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  foreign key (behavior_id, user_id) references public.behaviors (id, user_id) on delete cascade,
  constraint experiments_window check (ends_on >= starts_on and ends_on - starts_on <= 30)
);

-- Aynı anda yalnızca bir aktif deney
create unique index experiments_one_active_uq on public.experiments (user_id) where status = 'active';
create index experiments_user_created_idx on public.experiments (user_id, created_at desc);

create trigger experiments_updated_at
  before update on public.experiments
  for each row execute function public.set_updated_at();

alter table public.experiments enable row level security;

create policy "experiments: select own" on public.experiments
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "experiments: insert own" on public.experiments
  for insert to authenticated
  with check ((select auth.uid()) = user_id
              and public.option_usable(intervention_option_id, 'intervention')
              and (trigger_option_id is null or public.option_usable(trigger_option_id, 'trigger')));
create policy "experiments: update own" on public.experiments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id
              and public.option_usable(intervention_option_id, 'intervention')
              and (trigger_option_id is null or public.option_usable(trigger_option_id, 'trigger')));
create policy "experiments: delete own" on public.experiments
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.experiments from anon;
grant select, insert, update, delete on public.experiments to authenticated;

-- Yeni deney başlat: varsa aktif deneyi kapatır (süresi dolmuşsa "tamamlandı",
-- dolmamışsa "vazgeçildi") ve yenisini bugünden itibaren 7 gün için açar.
create or replace function public.start_experiment(
  p_intervention uuid,
  p_trigger uuid default null,
  p_behavior uuid default null,
  p_min_urge smallint default 0,
  p_today date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.experiments
     set status = case when ends_on < p_today then 'completed'::public.experiment_status
                       else 'abandoned'::public.experiment_status end,
         ended_at = now()
   where user_id = (select auth.uid()) and status = 'active';

  insert into public.experiments (behavior_id, trigger_option_id, intervention_option_id, min_urge, starts_on, ends_on)
  values (p_behavior, p_trigger, p_intervention, coalesce(p_min_urge, 0), p_today, p_today + 6)
  returning id into v_id;

  return v_id;
end;
$$;

-- Deney sonucu: dönem içindeki kayıtlardan hesaplanır (RLS geçerli).
--  fırsat     : kurala uyan dürtü (davranış, tetikleyici, eşik)
--  uygulandı  : o fırsatta deneydeki alternatif denendi
create or replace function public.experiment_results(p_experiment uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with x as (
    select * from public.experiments
    where id = p_experiment and user_id = (select auth.uid())
  ),
  opp as (
    select e.id, e.urge_change,
           exists (
             select 1 from public.event_interventions i
             where i.event_id = e.id and i.option_id = x.intervention_option_id
           ) as applied
    from x
    join public.urge_events e
      on e.user_id = x.user_id
     and e.deleted_at is null
     and e.local_date between x.starts_on and x.ends_on
     and (x.behavior_id is null or e.behavior_id = x.behavior_id)
     and (x.min_urge = 0 or e.urge_before >= x.min_urge)
     and (x.trigger_option_id is null or exists (
           select 1 from public.event_triggers t
           where t.event_id = e.id and t.option_id = x.trigger_option_id))
  )
  select case when not exists (select 1 from x) then null else jsonb_build_object(
    'opportunities',    (select count(*) from opp),
    'applied',          (select count(*) from opp where applied),
    'applied_measured', (select count(urge_change) from opp where applied),
    'applied_avg',      (select round(avg(urge_change), 1) from opp where applied),
    'other_measured',   (select count(urge_change) from opp where not applied),
    'other_avg',        (select round(avg(urge_change), 1) from opp where not applied)
  ) end;
$$;

revoke all on function public.start_experiment(uuid, uuid, uuid, smallint, date) from public, anon;
revoke all on function public.experiment_results(uuid) from public, anon;
grant execute on function public.start_experiment(uuid, uuid, uuid, smallint, date) to authenticated;
grant execute on function public.experiment_results(uuid) to authenticated;
