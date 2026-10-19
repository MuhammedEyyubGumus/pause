-- PAUSE · Migration 015: Kişisel araç kutusu (brief: "Zamanla kişiselleşen Personal Toolbox")
-- * toolbox_items: kullanıcının bir alternatifi sabitlemesi, gizlemesi ve kendine not yazması
-- * get_toolbox(): her alternatif için kişisel istatistik (kaç kez, ortalama değişim,
--   davranışı yapmama oranı, en çok işe yaradığı tetikleyici/duygu) + tercihler
-- Hepsi yalnızca kullanıcının kendi verisiyle çalışır (security invoker + RLS).

create table public.toolbox_items (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  option_id  uuid not null references public.options (id) on delete cascade,
  pinned     boolean not null default false,
  hidden     boolean not null default false,
  note       text check (char_length(note) <= 140),
  updated_at timestamptz not null default now(),
  primary key (user_id, option_id),
  -- Aynı anda hem sabit hem gizli olamaz
  constraint toolbox_items_pin_or_hide check (not (pinned and hidden))
);

alter table public.toolbox_items enable row level security;

create policy "toolbox_items: select own" on public.toolbox_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "toolbox_items: insert own" on public.toolbox_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.option_usable(option_id, 'intervention'));
create policy "toolbox_items: update own" on public.toolbox_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.option_usable(option_id, 'intervention'));
create policy "toolbox_items: delete own" on public.toolbox_items
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.toolbox_items from anon;
grant select, insert, update, delete on public.toolbox_items to authenticated;

-- ---------------------------------------------------------------------
-- Kişisel istatistikler
-- p_behavior verilirse yalnızca o davranışın kayıtları ve o davranışta
-- gösterilen alternatifler; verilmezse tüm davranışlar.
-- ---------------------------------------------------------------------
create or replace function public.get_toolbox(p_behavior uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (select (select auth.uid()) uid),
  ev as (
    select e.id, e.urge_change, e.outcome_class
    from public.urge_events e, me
    where e.user_id = me.uid
      and e.deleted_at is null
      and (p_behavior is null or e.behavior_id = p_behavior)
  ),
  -- Bir olayda aynı alternatif birden çok kez denendiyse tek sayılır
  intv as (
    select i.event_id, i.option_id, bool_or(i.completed) completed, max(i.started_at) last_at
    from public.event_interventions i join ev on ev.id = i.event_id
    group by i.event_id, i.option_id
  ),
  stats as (
    select i.option_id,
           count(*) uses,
           count(*) filter (where i.completed) completed,
           count(ev.urge_change) n,
           round(avg(ev.urge_change), 1) avg_change,
           count(*) filter (where ev.urge_change < 0) dropped,
           count(*) filter (where ev.outcome_class in ('not_done', 'alternative')) kept,
           count(*) filter (where ev.outcome_class is not null and ev.outcome_class <> 'undecided') with_outcome,
           max(i.last_at) last_used
    from intv i join ev on ev.id = i.event_id
    group by i.option_id
  ),
  -- Dürtünün düştüğü olaylarda en sık görülen tetikleyici ve duygu
  best_trigger as (
    select distinct on (i.option_id) i.option_id, t.option_id trigger_id, count(*) n
    from intv i
    join ev on ev.id = i.event_id and ev.urge_change < 0
    join public.event_triggers t on t.event_id = i.event_id
    group by i.option_id, t.option_id
    order by i.option_id, count(*) desc, t.option_id
  ),
  best_emotion as (
    select distinct on (i.option_id) i.option_id, m.option_id emotion_id, count(*) n
    from intv i
    join ev on ev.id = i.event_id and ev.urge_change < 0
    join public.event_emotions m on m.event_id = i.event_id
    group by i.option_id, m.option_id
    order by i.option_id, count(*) desc, m.option_id
  ),
  tools as (
    select o.id, o.key, o.label, o.behavior_id, o.behavior_template_key, o.sort_order
    from public.options o, me
    where o.kind = 'intervention'
      and not o.is_archived
      and (o.user_id is null or o.user_id = me.uid)
      and (
        case when p_behavior is null then
          -- Davranışa özel alternatifler yalnızca o davranış takip ediliyorsa
          (o.behavior_id is null or exists (
             select 1 from public.behaviors b
             where b.id = o.behavior_id and b.user_id = me.uid and b.archived_at is null))
          and (o.behavior_template_key is null or exists (
             select 1 from public.behaviors b
             where b.template_key = o.behavior_template_key and b.user_id = me.uid and b.archived_at is null))
        else
          (o.behavior_id is null or o.behavior_id = p_behavior)
          and (o.behavior_template_key is null or exists (
             select 1 from public.behaviors b
             where b.id = p_behavior and b.user_id = me.uid and b.template_key = o.behavior_template_key))
        end
      )
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', tl.id, 'key', tl.key, 'label', tl.label,
           'behavior_id', tl.behavior_id, 'behavior_template_key', tl.behavior_template_key,
           'sort_order', tl.sort_order,
           'uses', coalesce(s.uses, 0), 'completed', coalesce(s.completed, 0),
           'n', coalesce(s.n, 0), 'avg_change', s.avg_change, 'dropped', coalesce(s.dropped, 0),
           'kept', coalesce(s.kept, 0), 'with_outcome', coalesce(s.with_outcome, 0),
           'last_used', s.last_used,
           'top_trigger_id', bt.trigger_id, 'top_trigger_n', bt.n,
           'top_emotion_id', be.emotion_id, 'top_emotion_n', be.n,
           'pinned', coalesce(p.pinned, false), 'hidden', coalesce(p.hidden, false), 'note', p.note
         ) order by tl.sort_order, tl.id), '[]'::jsonb)
  from tools tl
  cross join me
  left join stats s on s.option_id = tl.id
  left join best_trigger bt on bt.option_id = tl.id
  left join best_emotion be on be.option_id = tl.id
  left join public.toolbox_items p on p.option_id = tl.id and p.user_id = me.uid;
$$;

revoke all on function public.get_toolbox(uuid) from public, anon;
grant execute on function public.get_toolbox(uuid) to authenticated;
