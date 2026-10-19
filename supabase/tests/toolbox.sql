-- PAUSE · Migration 015 testi: kişisel araç kutusu
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-1515-0000-0000-000000000001', 'a15@test.local'),
  ('bbbbbbbb-1515-0000-0000-000000000002', 'b15@test.local');

set local role authenticated;

-- B'nin kendi alternatifi (A görmemeli, kullanamamalı)
select set_config('request.jwt.claim.sub', 'bbbbbbbb-1515-0000-0000-000000000002', true);
insert into public.options (id, kind, label) values ('b1515000-0000-0000-0000-0000000000c1', 'intervention', 'B''nin aracı');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-1515-0000-0000-000000000001', true);
insert into public.behaviors (id, template_key, name) values
  ('a1515000-0000-0000-0000-0000000000b1', 'smoking', 'Sigara'),
  ('a1515000-0000-0000-0000-0000000000b2', 'social_media', 'Sosyal medya');
insert into public.options (id, kind, label) values ('a1515000-0000-0000-0000-0000000000c1', 'intervention', 'Duş al');

-- 6 olay nefes (8 → 5), 4'ünde davranış yapılmadı; 2 olay müzik (6 → 7); 1 olay kendi aracı (ölçümsüz)
insert into public.urge_events (id, behavior_id, occurred_at, local_date, local_hour, local_weekday, urge_before, urge_after,
                                outcome_option_id, source)
select ('a1515000-0000-0000-0000-00000000e0' || lpad(g::text, 2, '0'))::uuid,
       'a1515000-0000-0000-0000-0000000000b1',
       timestamptz '2026-10-01 10:00+00' + (g || ' hours')::interval,
       '2026-10-01', 10, 4,
       case when g <= 6 then 8 when g <= 8 then 6 else 7 end,
       case when g <= 6 then 5 when g <= 8 then 7 end,
       case when g <= 4 then (select id from public.options where user_id is null and kind = 'outcome' and key = 'not_done')
            when g in (5, 6) then (select id from public.options where user_id is null and kind = 'outcome' and key = 'occurred') end,
       'live'
from generate_series(1, 9) g;

insert into public.event_interventions (event_id, option_id, position, completed, started_at)
select e.id,
       case when g <= 6 then (select id from public.options where user_id is null and kind = 'intervention' and key = 'breathe')
            when g <= 8 then (select id from public.options where user_id is null and kind = 'intervention' and key = 'music')
            else 'a1515000-0000-0000-0000-0000000000c1'::uuid end,
       0, g <> 2, e.occurred_at + interval '1 minute'
from generate_series(1, 9) g
join public.urge_events e on e.id = ('a1515000-0000-0000-0000-00000000e0' || lpad(g::text, 2, '0'))::uuid;
-- Aynı olayda nefes ikinci kez: tek sayılmalı
insert into public.event_interventions (event_id, option_id, position, completed, started_at)
values ('a1515000-0000-0000-0000-00000000e001',
        (select id from public.options where user_id is null and kind = 'intervention' and key = 'breathe'), 1, true, now());

-- Tetikleyici/duygu: nefesin düşürdüğü 6 olayın 5'inde iş, 1'inde aile; hepsinde kaygı
insert into public.event_triggers (event_id, option_id)
select ('a1515000-0000-0000-0000-00000000e0' || lpad(g::text, 2, '0'))::uuid,
       (select id from public.options where user_id is null and kind = 'trigger' and key = case when g <= 5 then 'work' else 'family' end)
from generate_series(1, 6) g;
insert into public.event_emotions (event_id, option_id)
select ('a1515000-0000-0000-0000-00000000e0' || lpad(g::text, 2, '0'))::uuid,
       (select id from public.options where user_id is null and kind = 'emotion' and key = 'anxious')
from generate_series(1, 6) g;

-- Tercihler
insert into public.toolbox_items (option_id, pinned, note)
values ((select id from public.options where user_id is null and kind = 'intervention' and key = 'breathe'), true, 'Balkonda');
insert into public.toolbox_items (option_id, hidden)
values ((select id from public.options where user_id is null and kind = 'intervention' and key = 'music'), true);

do $$
declare
  r jsonb := public.get_toolbox();
  br jsonb := (select x from jsonb_array_elements(r) x where x->>'key' = 'breathe');
  mu jsonb := (select x from jsonb_array_elements(r) x where x->>'key' = 'music');
  own jsonb := (select x from jsonb_array_elements(r) x where x->>'label' = 'Duş al');
  sw jsonb := (select x from jsonb_array_elements(r) x where x->>'key' = 'urge_surf');
begin
  assert jsonb_array_length(r) = 10, '9 sistem + 1 kendi aracı: ' || jsonb_array_length(r);
  assert not exists (select 1 from jsonb_array_elements(r) x where x->>'label' = 'B''nin aracı'), 'başkasının aracı görünmemeli';

  assert (br->>'uses')::int = 6 and (br->>'n')::int = 6, 'nefes 6 olay (aynı olayda iki kez tek sayılır): ' || br::text;
  assert (br->>'avg_change')::numeric = -3.0 and (br->>'dropped')::int = 6, 'nefes ortalama -3';
  assert (br->>'kept')::int = 4 and (br->>'with_outcome')::int = 6, 'nefes: 6 sonucun 4''ünde yapılmadı';
  assert (br->>'completed')::int = 5, 'tamamlanan olay sayısı (2. olay yarıda bırakıldı): ' || (br->>'completed');
  assert br->>'top_trigger_id' = (select id::text from public.options where user_id is null and kind = 'trigger' and key = 'work')
         and (br->>'top_trigger_n')::int = 5, 'en çok iş tetikleyicisinde işe yaradı';
  assert br->>'top_emotion_id' = (select id::text from public.options where user_id is null and kind = 'emotion' and key = 'anxious'), 'kaygı';
  assert (br->>'pinned')::boolean and br->>'note' = 'Balkonda', 'sabit + not';

  assert (mu->>'avg_change')::numeric = 1.0 and mu->'top_trigger_id' = 'null'::jsonb, 'müzik yükseltti; düşüş yok';
  assert (mu->>'hidden')::boolean and not (mu->>'pinned')::boolean, 'müzik gizli';

  assert (own->>'uses')::int = 1 and (own->>'n')::int = 0 and own->'avg_change' = 'null'::jsonb, 'kendi aracı ölçümsüz';
  assert (sw->>'uses')::int = 0 and not (sw->>'pinned')::boolean, 'denenmemiş araç';

  -- Davranış filtresi: sosyal medyada kayıt yok
  assert (select bool_and((x->>'uses')::int = 0) from jsonb_array_elements(public.get_toolbox('a1515000-0000-0000-0000-0000000000b2')) x),
         'diğer davranışta istatistik yok';
  assert ((select x from jsonb_array_elements(public.get_toolbox('a1515000-0000-0000-0000-0000000000b1')) x
           where x->>'key' = 'breathe')->>'uses')::int = 6, 'davranış filtresi';

  -- Hem sabit hem gizli olamaz
  begin
    update public.toolbox_items set hidden = true
    where option_id = (select id from public.options where user_id is null and kind = 'intervention' and key = 'breathe');
    raise exception 'TEST FAILED: hem sabit hem gizli kabul edildi';
  exception when check_violation then null;
  end;
  -- Başkasının aracı ya da alternatif olmayan bir seçenek eklenemez
  begin
    insert into public.toolbox_items (option_id, pinned) values ('b1515000-0000-0000-0000-0000000000c1', true);
    raise exception 'TEST FAILED: başkasının aracı eklendi';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.toolbox_items (option_id, pinned)
    values ((select id from public.options where user_id is null and kind = 'emotion' and key = 'sad'), true);
    raise exception 'TEST FAILED: duygu araç kutusuna eklendi';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.toolbox_items (option_id, note)
    values ((select id from public.options where user_id is null and kind = 'intervention' and key = 'move'), repeat('x', 141));
    raise exception 'TEST FAILED: 140 karakterden uzun not';
  exception when check_violation then null;
  end;
end $$;

-- B, A'nın verisini ve tercihlerini görmez
select set_config('request.jwt.claim.sub', 'bbbbbbbb-1515-0000-0000-000000000002', true);
do $$
declare r jsonb := public.get_toolbox();
begin
  assert (select count(*) from public.toolbox_items) = 0, 'B, A''nın tercihlerini görmemeli';
  assert (select bool_and((x->>'uses')::int = 0 and not (x->>'pinned')::boolean) from jsonb_array_elements(r) x), 'B''de istatistik yok';
  assert exists (select 1 from jsonb_array_elements(r) x where x->>'label' = 'B''nin aracı'), 'B kendi aracını görür';
  assert not exists (select 1 from jsonb_array_elements(r) x where x->>'label' = 'Duş al'), 'B, A''nın aracını görmez';
  update public.toolbox_items set pinned = false;  -- etkisiz olmalı
end $$;

reset role;
do $$ begin
  assert (select pinned from public.toolbox_items
          where user_id = 'aaaaaaaa-1515-0000-0000-000000000001'
            and option_id = (select id from public.options where user_id is null and kind = 'intervention' and key = 'breathe')),
         'B, A''nın tercihini değiştirememeli';
end $$;

set local role anon;
do $$ begin
  begin
    perform public.get_toolbox();
    raise exception 'TEST FAILED: anon çağırdı';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'ARAÇ KUTUSU TESTLERİ GEÇTİ' as sonuc;
rollback;
