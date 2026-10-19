-- PAUSE · Migration 016: "Yolun" görselleştirmesi (brief bölüm 36: PATH)
-- get_timeline(): kullanıcının kendi kayıtlarından
--   * events: son kayıtlar (eskiden yeniye) — yoldaki adımlar
--   * weeks : son N hafta (Pazartesi başlangıçlı) haftalık özet — eğilim grafiği
--   * heat  : haftanın günü × saat dürtü sayıları — ısı haritası
-- Yalnızca ilerleme görseli içindir; security invoker + RLS ile yalnızca kendi verisi.

create or replace function public.get_timeline(
  p_behavior uuid default null,
  p_today    date default null,
  p_weeks    int  default 12,
  p_limit    int  default 150
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with ev as (
    select e.id, e.occurred_at, e.local_date, e.local_hour, e.local_weekday,
           e.urge_before, e.urge_after, e.urge_change, e.pause_status, e.outcome_class
    from public.urge_events e
    where e.user_id = (select auth.uid())
      and e.deleted_at is null
      and (p_behavior is null or e.behavior_id = p_behavior)
  ),
  -- Her alternatifin ilk kez denendiği olay: yolda "yeni yol" işareti
  first_use as (
    select distinct on (i.option_id) i.option_id, i.event_id
    from public.event_interventions i join ev on ev.id = i.event_id
    order by i.option_id, ev.occurred_at, i.position
  ),
  recent as (
    select * from ev order by occurred_at desc
    limit greatest(1, least(coalesce(p_limit, 150), 500))
  ),
  params as (
    select greatest(1, least(coalesce(p_weeks, 12), 52)) w,
           coalesce(p_today, current_date) - (extract(isodow from coalesce(p_today, current_date))::int - 1) this_week
  ),
  wk as (
    select local_date - (extract(isodow from local_date)::int - 1) ws,
           count(*) urges,
           round(avg(urge_before), 1) avg_before,
           round(avg(urge_after), 1) avg_after,
           count(*) filter (where outcome_class in ('not_done', 'alternative')) kept,
           count(*) filter (where outcome_class = 'stopped_early') stopped,
           count(*) filter (where outcome_class = 'occurred') occurred
    from ev group by 1
  )
  select jsonb_build_object(
    'total', (select count(*) from ev),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id,
               'at', r.occurred_at,
               'date', r.local_date,
               'outcome', r.outcome_class,
               'paused', r.pause_status <> 'none',
               'change', r.urge_change,
               'new_tools', coalesce((select jsonb_agg(f.option_id) from first_use f where f.event_id = r.id), '[]'::jsonb)
             ) order by r.occurred_at)
      from recent r
    ), '[]'::jsonb),
    'weeks', (
      select jsonb_agg(jsonb_build_object(
               'start', g.ws,
               'urges', coalesce(wk.urges, 0),
               'avg_before', wk.avg_before,
               'avg_after', wk.avg_after,
               'kept', coalesce(wk.kept, 0),
               'stopped', coalesce(wk.stopped, 0),
               'occurred', coalesce(wk.occurred, 0)
             ) order by g.ws)
      from params p
      cross join lateral (
        select (p.this_week - (n * 7))::date ws from generate_series(0, p.w - 1) n
      ) g
      left join wk on wk.ws = g.ws
    ),
    'heat', (
      select jsonb_agg(row order by d.d)
      from generate_series(1, 7) d(d)
      cross join lateral (
        select jsonb_agg(coalesce(c.n, 0) order by h.h) row
        from generate_series(0, 23) h(h)
        left join (
          select local_hour, count(*) n from ev where local_weekday = d.d group by local_hour
        ) c on c.local_hour = h.h
      ) x
    )
  );
$$;

revoke all on function public.get_timeline(uuid, date, int, int) from public, anon;
grant execute on function public.get_timeline(uuid, date, int, int) to authenticated;
