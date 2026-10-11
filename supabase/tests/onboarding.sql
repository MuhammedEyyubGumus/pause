-- PAUSE · Migration 002 testi (her şey ROLLBACK ile geri alınır)
begin;

insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000003', 'c@test.local');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);

insert into public.behaviors (template_key, name, icon, usual_times)
values ('smoking', 'Sigara', 'cigarette', array['evening', 'night']);

do $$ begin
  -- Geçersiz gün dilimi reddedilmeli
  begin
    insert into public.behaviors (name, usual_times) values ('x', array['noon']);
    raise exception 'TEST FAILED: geçersiz usual_times kabul edildi';
  exception when check_violation then null;
  end;

  -- Aynı şablon iki kez aktif olamaz
  begin
    insert into public.behaviors (template_key, name) values ('smoking', 'Sigara 2');
    raise exception 'TEST FAILED: aynı şablon iki kez eklendi';
  exception when unique_violation then null;
  end;
end $$;

-- Arşivlenen şablon yeniden eklenebilir; özel davranışlar (template_key null) serbest
update public.behaviors set archived_at = now() where template_key = 'smoking';
insert into public.behaviors (template_key, name) values ('smoking', 'Sigara');
insert into public.behaviors (name) values ('Gece atıştırması'), ('Gece atıştırması 2');

-- Profil güncellemesi (onboarding'in son adımı)
update public.profiles
   set onboarding_completed_at = now(), locale = 'tr', timezone = 'Europe/Istanbul',
       consents = consents || jsonb_build_object('safety_notice_ack', now())
 where id = 'cccccccc-0000-0000-0000-000000000003';

do $$ begin
  assert (select count(*) from public.behaviors where archived_at is null) = 3, '3 aktif davranış olmalı';
  assert (select onboarding_completed_at is not null from public.profiles), 'profil güncellenmedi';
end $$;

reset role;
select 'ONBOARDING TESTLERİ GEÇTİ' as sonuc;
rollback;
