-- =====================================================================
-- PAUSE · RLS izolasyon testi
-- İki kullanıcı (A ve B) oluşturur; B'nin A'nın verisini göremediğini,
-- değiştiremediğini ve A adına kayıt atamadığını doğrular.
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
-- Başarılıysa sonda "TÜM RLS TESTLERİ GEÇTİ" yazar, değilse hata verir.
-- =====================================================================
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

-- Profiller tetikleyiciyle oluştu mu?
do $$ begin
  assert (select count(*) from public.profiles
          where id in ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002')) = 2,
    'profiles otomatik oluşmadı';
end $$;

-- ---------- Kullanıcı A olarak veri oluştur ----------
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

insert into public.behaviors (id, name, template_key)
values ('a0000000-0000-0000-0000-0000000000b1', 'Sosyal medya', 'social_media');

insert into public.options (id, kind, label)
values ('a0000000-0000-0000-0000-0000000000c1', 'trigger', 'Toplantı sonrası');

insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday,
                                urge_before, pause_minutes, pause_started_at, pause_ends_at, pause_status)
values ('a0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-0000000000b1',
        current_date, 14, 3, 8, 10, now(), now() + interval '10 minutes', 'active');

-- Brief'in uçtan uca senaryosu: 8 -> 4, sonuç seçimi kanonik sınıfı doldurmalı
update public.urge_events
   set urge_after = 4, pause_status = 'completed', pause_completed_at = now(),
       outcome_option_id = (select id from public.options where user_id is null and kind = 'outcome' and key = 'not_done')
 where id = 'a0000000-0000-0000-0000-0000000000e1';

do $$ begin
  assert (select urge_change from public.urge_events where id = 'a0000000-0000-0000-0000-0000000000e1') = -4,
    'urge_change -4 olmalı';
  assert (select outcome_class::text from public.urge_events where id = 'a0000000-0000-0000-0000-0000000000e1') = 'not_done',
    'outcome_class otomatik dolmadı';
  assert (select count(*) from public.options) = 33, 'A: 32 sistem + 1 kendi seçeneğini görmeli';
end $$;

-- ---------- Kullanıcı B olarak saldır ----------
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);

do $$
declare n int;
begin
  -- 1. Okuma: A'nın hiçbir şeyi görünmemeli
  assert (select count(*) from public.behaviors) = 0,   'B, A''nın davranışını görüyor';
  assert (select count(*) from public.urge_events) = 0, 'B, A''nın olayını görüyor';
  assert (select count(*) from public.profiles) = 1,    'B yalnızca kendi profilini görmeli';
  assert (select count(*) from public.options where user_id is not null) = 0, 'B, A''nın özel seçeneğini görüyor';
  assert (select count(*) from public.options) = 32,    'B sistem seçeneklerini görmeli';

  -- 2. Güncelleme / silme: etkisiz kalmalı (0 satır)
  update public.urge_events set urge_after = 10 where id = 'a0000000-0000-0000-0000-0000000000e1';
  get diagnostics n = row_count; assert n = 0, 'B, A''nın olayını güncelledi';
  delete from public.behaviors where id = 'a0000000-0000-0000-0000-0000000000b1';
  get diagnostics n = row_count; assert n = 0, 'B, A''nın davranışını sildi';
  update public.options set label = 'x' where user_id is null;
  get diagnostics n = row_count; assert n = 0, 'B sistem seçeneğini değiştirdi';

  -- 3. A adına davranış eklemek: reddedilmeli
  begin
    insert into public.behaviors (user_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'sahte');
    raise exception 'TEST FAILED: B, A adına davranış ekledi';
  exception when insufficient_privilege then null;
  end;

  -- 4. Kendi adına ama A'nın davranışına olay bağlamak: reddedilmeli (bileşik FK)
  begin
    insert into public.urge_events (behavior_id, local_date, local_hour, local_weekday, urge_before)
    values ('a0000000-0000-0000-0000-0000000000b1', current_date, 10, 1, 5);
    raise exception 'TEST FAILED: B, A''nın davranışına olay bağladı';
  exception when foreign_key_violation then null;
  end;

  -- 5. Sistem seçeneği eklemek (user_id null): reddedilmeli
  begin
    insert into public.options (user_id, kind, key) values (null, 'emotion', 'hack');
    raise exception 'TEST FAILED: B sistem seçeneği ekledi';
  exception when insufficient_privilege or check_violation then null;
  end;

  -- 6. Kendi olayını A'nın özel seçeneğiyle sonuçlandırmak: reddedilmeli
  insert into public.behaviors (id, name) values ('b0000000-0000-0000-0000-0000000000b2', 'Sigara');
  insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday, urge_before)
  values ('b0000000-0000-0000-0000-0000000000e2', 'b0000000-0000-0000-0000-0000000000b2', current_date, 9, 2, 6);
  begin
    update public.urge_events set outcome_option_id = 'a0000000-0000-0000-0000-0000000000c1'
     where id = 'b0000000-0000-0000-0000-0000000000e2';
    raise exception 'TEST FAILED: B, A''nın seçeneğini kullandı';
  exception when insufficient_privilege then null;
  end;

  -- 7. Kendi kaydını başkasına devretmek: reddedilmeli
  begin
    update public.behaviors set user_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     where id = 'b0000000-0000-0000-0000-0000000000b2';
    raise exception 'TEST FAILED: B kaydını A''ya devretti';
  exception when insufficient_privilege or foreign_key_violation then null;
  end;
end $$;

-- ---------- Giriş yapmamış kullanıcı ----------
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.urge_events limit 1;
    raise exception 'TEST FAILED: anon urge_events okuyabiliyor';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'TÜM RLS TESTLERİ GEÇTİ' as sonuc;

rollback;
