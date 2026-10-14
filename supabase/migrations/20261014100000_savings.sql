-- PAUSE · Migration 012: Para harcanan davranışlarda tasarruf
-- Kullanıcı bir davranış için "bir seferde ortalama ne harcıyorum?" tutarını girer.
-- Dürtü gelip davranış yapılmadığında (sonuç: yapmadım / farklı bir seçim) o tutar
-- "harcanmadı" sayılır. Erken durulan olaylar ayrıca sayılır ama tutara katılmaz
-- (ne kadar harcandığı bilinmez). Bir ödül sistemi değil; olgusal bir bilgi.

alter table public.behaviors
  add column cost_amount   numeric(10, 2) check (cost_amount is null or (cost_amount >= 0 and cost_amount <= 100000)),
  add column cost_currency text not null default 'TRY' check (cost_currency in ('TRY', 'USD', 'EUR', 'GBP'));

-- Davranış başına dürtü / sonuç sayıları ve harcanmayan tutar. security invoker: RLS geçerli.
create or replace function public.get_savings(p_behavior uuid default null, p_from date default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(row_to_json(s) order by s.saved desc nulls last, s.urges desc), '[]'::jsonb)
  from (
    select b.id as behavior_id,
           b.cost_amount,
           b.cost_currency,
           count(e.id)                                                            as urges,
           count(e.id) filter (where e.outcome_class in ('not_done', 'alternative')) as not_done,
           count(e.id) filter (where e.outcome_class = 'stopped_early')           as stopped_early,
           count(e.id) filter (where e.outcome_class = 'occurred')                as occurred,
           count(e.id) filter (where e.outcome_class is null or e.outcome_class = 'undecided') as open,
           case when b.cost_amount is null then null
                else b.cost_amount * count(e.id) filter (where e.outcome_class in ('not_done', 'alternative'))
           end                                                                    as saved
    from public.behaviors b
    left join public.urge_events e
      on e.behavior_id = b.id
     and e.user_id = b.user_id
     and e.deleted_at is null
     and (p_from is null or e.local_date >= p_from)
    where b.user_id = (select auth.uid())
      and (p_behavior is null or b.id = p_behavior)
      and (b.archived_at is null or e.id is not null)
    group by b.id, b.cost_amount, b.cost_currency, b.sort_order
  ) s;
$$;

revoke all on function public.get_savings(uuid, date) from public, anon;
grant execute on function public.get_savings(uuid, date) to authenticated;
