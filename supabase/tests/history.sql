-- PAUSE · Geçmiş ekranının yaptığı işlemler: düzenleme, sonuç temizleme, sonradan kayıt, silme
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-2222-0000-0000-000000000001', 'a4@test.local'),
  ('bbbbbbbb-2222-0000-0000-000000000002', 'b4@test.local');
set local role authenticated;

-- B'nin bir davranışı olsun (A bunu kullanmaya çalışacak)
select set_config('request.jwt.claim.sub', 'bbbbbbbb-2222-0000-0000-000000000002', true);
insert into public.behaviors (id, name) values ('b2000000-0000-0000-0000-0000000000b9', 'B davranışı');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-2222-0000-0000-000000000001', true);
insert into public.behaviors (id, template_key, name) values
  ('a2000000-0000-0000-0000-0000000000b1', 'smoking', 'Sigara'),
  ('a2000000-0000-0000-0000-0000000000b2', 'social_media', 'Sosyal medya');

-- Sonradan kayıt (pause yok)
insert into public.urge_events (id, behavior_id, occurred_at, local_date, local_hour, local_weekday,
                                urge_before, pause_status, source, outcome_option_id)
values ('a2000000-0000-0000-0000-0000000000e1', 'a2000000-0000-0000-0000-0000000000b1', now() - interval '3 hours',
        current_date, 11, 3, 7, 'none', 'retro',
        (select id from public.options where user_id is null and kind = 'outcome' and key = 'occurred'));

do $$ begin
  assert (select outcome_class::text from public.urge_events where id = 'a2000000-0000-0000-0000-0000000000e1') = 'occurred',
    'sonradan kayıtta sonuç sınıfı dolmalı';
end $$;

-- Düzenleme: davranışı değiştir, sonucu temizle, not ekle
update public.urge_events
   set behavior_id = 'a2000000-0000-0000-0000-0000000000b2', outcome_option_id = null, outcome_class = null,
       urge_after = 3, notes = 'toplantıdan sonra'
 where id = 'a2000000-0000-0000-0000-0000000000e1';

do $$ begin
  assert (select outcome_class is null and urge_change = -4 from public.urge_events
          where id = 'a2000000-0000-0000-0000-0000000000e1'), 'düzenleme uygulanmadı';

  -- Kendi olayını başkasının davranışına taşımak: reddedilmeli
  begin
    update public.urge_events set behavior_id = 'b2000000-0000-0000-0000-0000000000b9'
     where id = 'a2000000-0000-0000-0000-0000000000e1';
    raise exception 'TEST FAILED: olay başkasının davranışına taşındı';
  exception when foreign_key_violation then null;
  end;
end $$;

-- Silme: kalıcı, bağlı kayıtlarla birlikte
insert into public.event_emotions (event_id, option_id)
select 'a2000000-0000-0000-0000-0000000000e1', id from public.options where user_id is null and kind = 'emotion' and key = 'tired';
delete from public.urge_events where id = 'a2000000-0000-0000-0000-0000000000e1';
do $$ begin
  assert (select count(*) from public.urge_events) = 0, 'olay silinmedi';
  assert (select count(*) from public.event_emotions) = 0, 'bağlı duygular silinmedi';
end $$;

reset role;
select 'GEÇMİŞ TESTLERİ GEÇTİ' as sonuc;
rollback;
