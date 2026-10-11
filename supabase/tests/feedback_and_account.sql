-- PAUSE · Geri bildirim + hesap silme testi
-- Hesap silindiğinde (auth.users satırı) TÜM tablolardaki verinin gittiğini doğrular.
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-5555-0000-0000-000000000001', 'a7@test.local'),
  ('bbbbbbbb-5555-0000-0000-000000000002', 'b7@test.local');

set local role authenticated;

-- ---------- A: her tabloya veri ----------
select set_config('request.jwt.claim.sub', 'aaaaaaaa-5555-0000-0000-000000000001', true);

insert into public.behaviors (id, name) values ('a5000000-0000-0000-0000-0000000000b1', 'Sigara');
insert into public.options (id, kind, label) values ('a5000000-0000-0000-0000-0000000000c1', 'trigger', 'Kahve');
insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday, urge_before)
values ('a5000000-0000-0000-0000-0000000000e1', 'a5000000-0000-0000-0000-0000000000b1', current_date, 9, 7, 6);
insert into public.event_triggers (event_id, option_id) values ('a5000000-0000-0000-0000-0000000000e1', 'a5000000-0000-0000-0000-0000000000c1');
insert into public.event_answers (event_id, question_key, value_num) values ('a5000000-0000-0000-0000-0000000000e1', 'physical_hunger', 4);
insert into public.push_subscriptions (endpoint, p256dh, auth)
values ('https://web.push.apple.com/abc', repeat('A', 87), repeat('B', 22));

insert into public.feedback (answers, would_reuse, screenshot_path)
values ('{"hard":"Bildirim izni","helpful":"Nefes"}', 8, 'aaaaaaaa-5555-0000-0000-000000000001/x.png');

do $$ begin
  -- Puan 1–10 dışında olamaz
  begin
    insert into public.feedback (would_reuse) values (11);
    raise exception 'TEST FAILED: would_reuse 11 kabul edildi';
  exception when check_violation then null;
  end;
  -- Ekran görüntüsü yolu başkasının klasörünü gösteremez
  begin
    insert into public.feedback (screenshot_path) values ('bbbbbbbb-5555-0000-0000-000000000002/x.png');
    raise exception 'TEST FAILED: başkasının klasörü kabul edildi';
  exception when check_violation then null;
  end;
end $$;

-- ---------- B: A'nın geri bildirimini göremez ----------
select set_config('request.jwt.claim.sub', 'bbbbbbbb-5555-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from public.feedback) = 0, 'B, A''nın geri bildirimini görüyor';
  begin
    insert into public.feedback (user_id, would_reuse) values ('aaaaaaaa-5555-0000-0000-000000000001', 1);
    raise exception 'TEST FAILED: B, A adına geri bildirim gönderdi';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------- Hesap silme (delete-account fonksiyonunun yaptığı) ----------
reset role;
delete from auth.users where id = 'aaaaaaaa-5555-0000-0000-000000000001';

do $$
declare uid uuid := 'aaaaaaaa-5555-0000-0000-000000000001';
begin
  assert (select count(*) from public.profiles where id = uid) = 0, 'profil kaldı';
  assert (select count(*) from public.behaviors where user_id = uid) = 0, 'davranışlar kaldı';
  assert (select count(*) from public.options where user_id = uid) = 0, 'özel seçenekler kaldı';
  assert (select count(*) from public.urge_events where user_id = uid) = 0, 'olaylar kaldı';
  assert (select count(*) from public.event_triggers where user_id = uid) = 0, 'tetikleyiciler kaldı';
  assert (select count(*) from public.event_answers where user_id = uid) = 0, 'cevaplar kaldı';
  assert (select count(*) from public.push_subscriptions where user_id = uid) = 0, 'bildirim aboneliği kaldı';
  assert (select count(*) from public.feedback where user_id = uid) = 0, 'geri bildirim kaldı';
  -- Sistem seçenekleri ve diğer kullanıcı etkilenmemeli
  assert (select count(*) from public.options where user_id is null) = 32, 'sistem seçenekleri etkilendi';
  assert (select count(*) from public.profiles where id = 'bbbbbbbb-5555-0000-0000-000000000002') = 1, 'B etkilendi';
end $$;

select 'GERİ BİLDİRİM VE HESAP SİLME TESTLERİ GEÇTİ' as sonuc;
rollback;
