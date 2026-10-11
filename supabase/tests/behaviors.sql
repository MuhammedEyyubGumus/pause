-- PAUSE · Ayarlar'da davranış yönetimi: ekleme, arşivleme, geri getirme
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values ('aaaaaaaa-4444-0000-0000-000000000001', 'a6@test.local');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-4444-0000-0000-000000000001', true);

-- Onboarding'de yalnızca sigara seçilmiş
insert into public.behaviors (id, template_key, name, icon, sort_order)
values ('a4000000-0000-0000-0000-0000000000b1', 'smoking', 'Sigara', 'cigarette', 0);

-- Sonradan alkol ekleniyor
insert into public.behaviors (id, template_key, name, icon, sort_order)
values ('a4000000-0000-0000-0000-0000000000b2', 'alcohol', 'Alkol', 'wine', 1);

-- Alkol için bir kayıt
insert into public.urge_events (id, behavior_id, local_date, local_hour, local_weekday, urge_before)
values ('a4000000-0000-0000-0000-0000000000e1', 'a4000000-0000-0000-0000-0000000000b2', current_date, 21, 6, 7);

-- Düzenleme: süre 5 dk, hedef bırakmak, neden
update public.behaviors set pause_minutes = 5, goal = 'quit', why = 'Sabahları dinç uyanmak'
 where id = 'a4000000-0000-0000-0000-0000000000b2';

do $$ begin
  begin
    update public.behaviors set pause_minutes = 7 where id = 'a4000000-0000-0000-0000-0000000000b2';
    raise exception 'TEST FAILED: geçersiz pause süresi kabul edildi';
  exception when check_violation then null;
  end;
end $$;

-- Takibi bırak: arşivle; kayıt silinmemeli
update public.behaviors set archived_at = now(), is_active = false where id = 'a4000000-0000-0000-0000-0000000000b2';
do $$ begin
  assert (select count(*) from public.urge_events where behavior_id = 'a4000000-0000-0000-0000-0000000000b2') = 1,
    'arşivlenen davranışın kaydı silindi';
  assert (select count(*) from public.behaviors where archived_at is null) = 1, '1 aktif davranış kalmalı';
end $$;

-- Tekrar ekle: aynı satır geri gelir, geçmişiyle birlikte
update public.behaviors set archived_at = null, is_active = true where id = 'a4000000-0000-0000-0000-0000000000b2';
do $$ begin
  assert (select count(*) from public.behaviors where template_key = 'alcohol') = 1, 'alkol için tek satır olmalı';
  assert (select pause_minutes = 5 and goal = 'quit' from public.behaviors where id = 'a4000000-0000-0000-0000-0000000000b2'),
    'geri gelen davranış ayarlarını korumalı';

  -- Aynı şablon aktifken ikinci kez eklenemez
  begin
    insert into public.behaviors (template_key, name) values ('alcohol', 'Alkol');
    raise exception 'TEST FAILED: aynı şablon iki kez aktif';
  exception when unique_violation then null;
  end;
end $$;

-- Selamlamadaki ad
update public.profiles set display_name = 'Muhammed' where id = 'aaaaaaaa-4444-0000-0000-000000000001';
do $$ begin
  assert (select display_name from public.profiles) = 'Muhammed', 'ad kaydedilmedi';
end $$;

reset role;
select 'DAVRANIŞ YÖNETİMİ TESTLERİ GEÇTİ' as sonuc;
rollback;
