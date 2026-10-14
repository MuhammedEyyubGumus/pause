-- PAUSE · Migration 013: Yönetim paneli
-- İlke (brief bölüm 38): "Her kullanıcı yalnızca kendi verisini görebilmeli."
-- Bu yüzden yöneticiler kimsenin dürtü kaydını, notunu, davranışını tek tek GÖREMEZ.
-- Panel yalnızca şunları gösterir:
--   * toplam sayılar (kullanıcı, kayıt, aktif kullanıcı...) — kişiye bağlanamayan özetler,
--   * anonim ürün ölçümü (app_events; zaten hesaba bağlı değil),
--   * test kullanıcılarının bilerek gönderdiği geri bildirimler ve ekran görüntüleri.
-- Tüm yönetim fonksiyonları security definer'dır ve önce çağıranın yönetici olduğunu doğrular.

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- Kişi yalnızca kendisinin yönetici olup olmadığını görebilir; ekleme/silme yalnızca SQL Editor'dan
create policy "admins: kendi satırını gör" on public.admins
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- Geri bildirim takibi: yönetici "okundu / tamamlandı" işaretler
alter table public.feedback
  add column admin_status text not null default 'new' check (admin_status in ('new', 'read', 'done'));

-- Yöneticiler geri bildirim ekran görüntülerini görebilir (yalnızca okuma)
create policy "feedback dosyaları: yöneticiler görür" on storage.objects
  for select to authenticated
  using (bucket_id = 'feedback' and public.is_admin());

-- ---------------------------------------------------------------------
-- Genel bakış: yalnızca toplamlar
-- ---------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'users',            (select count(*) from auth.users),
    'onboarded',        (select count(*) from public.profiles where onboarding_completed_at is not null),
    'new_users_7d',     (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'active_7d',        (select count(distinct user_id) from public.urge_events
                          where deleted_at is null and created_at > now() - interval '7 days'),
    'active_30d',       (select count(distinct user_id) from public.urge_events
                          where deleted_at is null and created_at > now() - interval '30 days'),
    'events',           (select count(*) from public.urge_events where deleted_at is null),
    'events_7d',        (select count(*) from public.urge_events
                          where deleted_at is null and created_at > now() - interval '7 days'),
    'paused_share',     (select round(avg((pause_status <> 'none')::int)::numeric, 2)
                           from public.urge_events where deleted_at is null),
    'remeasured_share', (select round(avg((remeasured_at is not null)::int)::numeric, 2)
                           from public.urge_events where deleted_at is null and pause_status <> 'none'),
    'reflections',      (select count(*) from public.reflections),
    'experiments',      (select count(*) from public.experiments),
    'push_users',       (select count(distinct user_id) from public.push_subscriptions),
    'feedback',         (select count(*) from public.feedback),
    'feedback_new',     (select count(*) from public.feedback where admin_status = 'new'),
    'avg_reuse',        (select round(avg(would_reuse)::numeric, 1) from public.feedback),
    -- Hangi davranışlar takip ediliyor (yalnızca şablon adı ve sayı; kullanıcı yok)
    'behaviors',        (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', n) order by n desc), '[]'::jsonb)
                           from (select coalesce(template_key, 'custom') k, count(*) n
                                   from public.behaviors where archived_at is null group by 1) t)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Anonim ürün ölçümü (brief bölüm 41) — supabase/setup/product_metrics.sql'in panel hali
-- ---------------------------------------------------------------------
create or replace function public.admin_product_metrics(p_days int default 14)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 14), 365)));
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'days', greatest(1, least(coalesce(p_days, 14), 365)),
    'onboarding', (
      select coalesce(jsonb_agg(jsonb_build_object('step', step, 'sessions', n) order by n desc), '[]'::jsonb)
      from (select props->>'step' step, count(distinct session_id) n
              from public.app_events where name = 'onboarding_step' and created_at > since group by 1) t
    ),
    'onboarding_completed', (select count(distinct session_id) from public.app_events
                              where name = 'onboarding_completed' and created_at > since),
    'flow', (
      select jsonb_build_object(
        'started',        count(*) filter (where name = 'urge_flow_started'),
        'pause_completed',count(*) filter (where name = 'pause_completed'),
        'completed',      count(*) filter (where name = 'urge_flow_completed'),
        'interventions',  count(*) filter (where name = 'intervention_started'),
        'reviews',        count(*) filter (where name = 'review_completed'))
      from public.app_events where created_at > since
    ),
    -- Tamamlanmayan oturumlarda görülen son adım: akış nerede yarıda kalıyor
    'drop_off', (
      select coalesce(jsonb_agg(jsonb_build_object('step', step, 'sessions', n) order by n desc), '[]'::jsonb)
      from (
        select step, count(*) n from (
          select session_id, props->>'step' step,
                 row_number() over (partition by session_id order by created_at desc) rn
          from public.app_events where name = 'urge_step' and created_at > since
        ) s
        where rn = 1 and session_id not in (
          select session_id from public.app_events where name = 'urge_flow_completed' and created_at > since)
        group by step
      ) t
    ),
    'interventions', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'started', st, 'completed', co) order by st desc), '[]'::jsonb)
      from (select props->>'key' k,
                   count(*) filter (where name = 'intervention_started') st,
                   count(*) filter (where name = 'intervention_completed' and props->>'completed' = 'true') co
              from public.app_events
             where name in ('intervention_started', 'intervention_completed') and created_at > since
             group by 1) t
    ),
    'screens', (
      select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', n, 'sessions', s) order by n desc), '[]'::jsonb)
      from (select name, count(*) n, count(distinct session_id) s
              from public.app_events
             where name in ('app_opened', 'insights_viewed', 'weekly_review_opened', 'review_started',
                            'feedback_sent', 'push_enabled')
               and created_at > since
             group by name) t
    )
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Geri bildirimler: kimlik yok; yalnızca cevaplar, puan, ekran görüntüsü yolu
-- ---------------------------------------------------------------------
create or replace function public.admin_feedback(p_status text default null, p_limit int default 50, p_offset int default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(f) order by f.created_at desc)
    from (
      select id, created_at, answers, would_reuse, screenshot_path, app_version, user_agent, admin_status
      from public.feedback
      where p_status is null or admin_status = p_status
      order by created_at desc
      limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0)
    ) f
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_set_feedback_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  update public.feedback set admin_status = p_status where id = p_id;
end;
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_product_metrics(int) from public, anon;
revoke all on function public.admin_feedback(text, int, int) from public, anon;
revoke all on function public.admin_set_feedback_status(uuid, text) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_product_metrics(int) to authenticated;
grant execute on function public.admin_feedback(text, int, int) to authenticated;
grant execute on function public.admin_set_feedback_status(uuid, text) to authenticated;

-- İlk yöneticiyi eklemek için (SQL Editor'da, kendi e-postanla):
--   insert into public.admins (user_id) select id from auth.users where email = 'SENIN-EPOSTAN';
