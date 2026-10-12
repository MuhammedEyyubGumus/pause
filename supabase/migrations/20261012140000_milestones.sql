-- PAUSE · Migration 011: Öğrenme kilometre taşları (brief bölüm 27–28)
-- Streak yok. Kilometre taşları "davranışı yapmadın" değil, öğrenme davranışını
-- ödüllendirir: kaydetmek, pause'u sonuna kadar beklemek, alternatif denemek,
-- erken durmak, zinciri incelemek, ilk kişisel örüntü, ilk deney.
--
-- Tasarım kararı: kazanılan taşlar ayrı bir tabloda tutulmaz; mevcut kayıtlardan
-- hesaplanır (tek doğruluk kaynağı). Yalnızca hangilerinin kutlandığı profilde saklanır,
-- böylece kutlama her cihazda bir kez görünür.

alter table public.profiles
  add column celebrated_milestones text[] not null default '{}'
    check (cardinality(celebrated_milestones) <= 50);

-- Her taş için kazanıldığı an (kazanılmadıysa null). security invoker: RLS geçerli.
create or replace function public.get_milestones()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with ev as (
    select e.id, e.occurred_at, e.remeasured_at, e.pause_status, e.outcome_class, e.urge_change
    from public.urge_events e
    where e.user_id = (select auth.uid()) and e.deleted_at is null
  ),
  -- İlk kişisel örüntü: bir alternatifin 5. ölçümlü kullanımı (içgörülerdeki n ≥ 5 eşiği)
  measured_uses as (
    select i.option_id, ev.occurred_at,
           row_number() over (partition by i.option_id order by ev.occurred_at) as n
    from (select distinct event_id, option_id from public.event_interventions) i
    join ev on ev.id = i.event_id
    where ev.urge_change is not null
  )
  select jsonb_build_object(
    'first_urge',          (select min(occurred_at) from ev),
    'first_pause',         (select min(remeasured_at) from ev where pause_status = 'completed' and remeasured_at is not null),
    'first_alternative',   (select min(coalesce(i.ended_at, i.started_at))
                              from public.event_interventions i join ev on ev.id = i.event_id
                             where i.completed),
    'first_stopped_early', (select min(occurred_at) from ev where outcome_class = 'stopped_early'),
    'ten_events',          (select occurred_at from ev order by occurred_at offset 9 limit 1),
    'first_review',        (select min(r.created_at) from public.reflections r join ev on ev.id = r.event_id),
    'first_pattern',       (select min(occurred_at) from measured_uses where n = 5),
    'first_experiment',    (select min(ended_at) from public.experiments
                             where user_id = (select auth.uid()) and status = 'completed')
  );
$$;

revoke all on function public.get_milestones() from public, anon;
grant execute on function public.get_milestones() to authenticated;
