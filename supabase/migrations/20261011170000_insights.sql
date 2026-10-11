-- PAUSE · Migration 006: İçgörüler (Phase 2)
-- Tek çağrıda bir dönemin özetini döndürür. security invoker: RLS geçerli,
-- kullanıcı yalnızca kendi kayıtlarını görür. Yorumlar (ör. "en iyi") istemcide
-- en az 5 ölçüm varsa yapılır; burada yalnızca sayılar hesaplanır.

-- Dönem filtresi için: kullanıcının olayları yerel tarihe göre
create index if not exists urge_events_user_local_date_idx
  on public.urge_events (user_id, local_date)
  where deleted_at is null;

create or replace function public.get_insights(p_from date default null, p_behavior uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with ev as (
    select e.id, e.local_hour, e.local_weekday, e.urge_before, e.urge_after, e.urge_change,
           e.pause_status, e.outcome_class, e.emergency_mode
    from public.urge_events e
    where e.user_id = (select auth.uid())
      and e.deleted_at is null
      and (p_from is null or e.local_date >= p_from)
      and (p_behavior is null or e.behavior_id = p_behavior)
  ),
  opt as (
    select o.id, o.kind, o.key, o.label from public.options o
  ),
  trig as (
    select t.event_id, t.option_id from public.event_triggers t join ev on ev.id = t.event_id
  ),
  intv as (
    -- Bir olayda aynı alternatif birden çok kez denendiyse tek sayılır
    select distinct i.event_id, i.option_id from public.event_interventions i join ev on ev.id = i.event_id
  )
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'urges',          count(*),
        'avg_before',     round(avg(urge_before), 1),
        'paused',         count(*) filter (where pause_status <> 'none'),
        'pause_completed',count(*) filter (where pause_status = 'completed'),
        'measured',       count(urge_change),
        'avg_change',     round(avg(urge_change), 1),
        'dropped',        count(*) filter (where urge_change < 0),
        'with_outcome',   count(*) filter (where outcome_class is not null and outcome_class <> 'undecided'),
        'not_done',       count(*) filter (where outcome_class in ('not_done', 'alternative')),
        'stopped_early',  count(*) filter (where outcome_class = 'stopped_early'),
        'occurred',       count(*) filter (where outcome_class = 'occurred'),
        'emergency',      count(*) filter (where emergency_mode)
      )
      from ev
    ),
    'hours', (
      select jsonb_agg(coalesce(c.n, 0) order by h.h)
      from generate_series(0, 23) h(h)
      left join (select local_hour, count(*) n from ev group by local_hour) c on c.local_hour = h.h
    ),
    'weekdays', (
      select jsonb_agg(coalesce(c.n, 0) order by d.d)
      from generate_series(1, 7) d(d)
      left join (select local_weekday, count(*) n from ev group by local_weekday) c on c.local_weekday = d.d
    ),
    'triggers', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', o.id, 'key', o.key, 'label', o.label,
               'n', s.n, 'avg_before', s.avg_before)
             order by s.n desc, s.avg_before desc nulls last)
      from (
        select t.option_id, count(*) n, round(avg(ev.urge_before), 1) avg_before
        from trig t join ev on ev.id = t.event_id
        group by t.option_id
      ) s join opt o on o.id = s.option_id
    ), '[]'::jsonb),
    'emotions', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'key', o.key, 'label', o.label, 'n', s.n) order by s.n desc)
      from (
        select m.option_id, count(*) n
        from public.event_emotions m join ev on ev.id = m.event_id
        group by m.option_id
      ) s join opt o on o.id = s.option_id
    ), '[]'::jsonb),
    -- Alternatif başına: kaç olayda denendi, kaçında yeniden ölçüm var, ortalama değişim
    'interventions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', o.id, 'key', o.key, 'label', o.label,
               'uses', s.uses, 'n', s.n, 'avg_change', s.avg_change)
             order by s.avg_change asc nulls last, s.n desc)
      from (
        select i.option_id, count(*) uses, count(ev.urge_change) n, round(avg(ev.urge_change), 1) avg_change
        from intv i join ev on ev.id = i.event_id
        group by i.option_id
      ) s join opt o on o.id = s.option_id
    ), '[]'::jsonb),
    -- Tetikleyici × alternatif: yalnızca yeniden ölçülmüş olaylar
    'pairs', coalesce((
      select jsonb_agg(jsonb_build_object(
               'trigger_id', s.trigger_id, 'intervention_id', s.intervention_id,
               'n', s.n, 'avg_change', s.avg_change)
             order by s.avg_change asc, s.n desc)
      from (
        select t.option_id trigger_id, i.option_id intervention_id,
               count(*) n, round(avg(ev.urge_change), 1) avg_change
        from trig t
        join intv i on i.event_id = t.event_id
        join ev on ev.id = t.event_id
        where ev.urge_change is not null
        group by t.option_id, i.option_id
      ) s
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_insights(date, uuid) from public, anon;
grant execute on function public.get_insights(date, uuid) to authenticated;
