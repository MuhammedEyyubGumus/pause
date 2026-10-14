-- PAUSE · Migration 012 testi: tasarruf hesabı
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-1212-0000-0000-000000000001', 'a12@test.local'),
  ('bbbbbbbb-1212-0000-0000-000000000002', 'b12@test.local');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1212-0000-0000-000000000001', true);

insert into public.behaviors (id, template_key, name, cost_amount) values
  ('a1212000-0000-0000-0000-0000000000b1', 'smoking', 'Sigara', 7.50),
  ('a1212000-0000-0000-0000-0000000000b2', 'social_media', 'Sosyal medya', null);

-- Sigara: 3 yapmadım, 1 farklı seçim, 1 erken durdum, 2 yaptım, 1 sonucu yok, 1 silinmiş
insert into public.urge_events (behavior_id, local_date, local_hour, local_weekday, source, outcome_option_id, deleted_at)
select 'a1212000-0000-0000-0000-0000000000b1', '2026-10-10', 10, 6, 'live',
       (select id from public.options where user_id is null and kind = 'outcome' and key = k), d
from (values ('not_done', null::timestamptz), ('not_done', null), ('not_done', null), ('different_choice', null),
             ('stopped_early', null), ('occurred', null), ('occurred', null), (null, null), ('not_done', now())) v(k, d);

insert into public.urge_events (behavior_id, local_date, local_hour, local_weekday, source)
values ('a1212000-0000-0000-0000-0000000000b2', '2026-10-01', 10, 4, 'live');

do $$
declare
  r jsonb := public.get_savings();
  smoke jsonb := (select x from jsonb_array_elements(r) x where x->>'behavior_id' = 'a1212000-0000-0000-0000-0000000000b1');
  social jsonb := (select x from jsonb_array_elements(r) x where x->>'behavior_id' = 'a1212000-0000-0000-0000-0000000000b2');
begin
  assert jsonb_array_length(r) = 2, 'iki davranış';
  assert (smoke->>'urges')::int = 8, 'silinmiş hariç 8 dürtü: ' || smoke::text;
  assert (smoke->>'not_done')::int = 4, 'yapmadım + farklı seçim = 4';
  assert (smoke->>'stopped_early')::int = 1 and (smoke->>'occurred')::int = 2 and (smoke->>'open')::int = 1, 'diğer sonuçlar';
  assert (smoke->>'saved')::numeric = 30.00, '4 × 7,50 = 30';
  assert smoke->>'cost_currency' = 'TRY', 'varsayılan para birimi';
  assert social->'saved' = 'null'::jsonb, 'tutar girilmemişse tasarruf hesaplanmaz';
  assert (public.get_savings(p_from => '2026-10-05')->0->>'urges')::int = 8, 'tarih filtresi';
  assert jsonb_array_length(public.get_savings('a1212000-0000-0000-0000-0000000000b2')) = 1, 'davranış filtresi';

  -- Geçersiz tutar / para birimi
  begin
    update public.behaviors set cost_amount = -1 where id = 'a1212000-0000-0000-0000-0000000000b1';
    raise exception 'TEST FAILED: negatif tutar kabul edildi';
  exception when check_violation then null;
  end;
  begin
    update public.behaviors set cost_currency = 'BTC' where id = 'a1212000-0000-0000-0000-0000000000b1';
    raise exception 'TEST FAILED: geçersiz para birimi kabul edildi';
  exception when check_violation then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'bbbbbbbb-1212-0000-0000-000000000002', true);
do $$ begin
  assert public.get_savings() = '[]'::jsonb, 'B, A''nın tasarrufunu görmemeli';
  assert public.get_savings('a1212000-0000-0000-0000-0000000000b1') = '[]'::jsonb, 'B filtreyle de göremez';
end $$;

reset role;
select 'TASARRUF TESTLERİ GEÇTİ' as sonuc;
rollback;
