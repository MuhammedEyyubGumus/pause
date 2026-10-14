-- PAUSE · Migration 014 testi: yönetici hesabı verme / kaldırma
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values ('aaaaaaaa-1414-0000-0000-000000000001', 'Admin14@Test.local');

do $$ begin
  assert public.grant_admin('admin14@test.local') like 'Yönetici yapıldı%', 'büyük/küçük harf fark etmemeli';
  assert exists (select 1 from public.admins where user_id = 'aaaaaaaa-1414-0000-0000-000000000001'), 'tabloya eklenmeli';
  assert (select raw_app_meta_data->>'role' from auth.users where id = 'aaaaaaaa-1414-0000-0000-000000000001') = 'admin', 'rol yazılmalı';
  assert public.grant_admin('admin14@test.local') like 'Yönetici yapıldı%', 'iki kez çağırmak sorun olmamalı';
  assert public.grant_admin('yok@test.local') like 'Bu e-postayla%', 'olmayan kullanıcı';
  assert public.revoke_admin('ADMIN14@test.local') like 'Yöneticilik kaldırıldı%', 'kaldırma';
  assert not exists (select 1 from public.admins where user_id = 'aaaaaaaa-1414-0000-0000-000000000001'), 'tablodan silinmeli';
  assert (select raw_app_meta_data ? 'role' from auth.users where id = 'aaaaaaaa-1414-0000-0000-000000000001') = false, 'rol silinmeli';
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1414-0000-0000-000000000001', true);
do $$ begin
  begin
    perform public.grant_admin('admin14@test.local');
    raise exception 'TEST FAILED: kullanıcı kendini yönetici yaptı';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'YÖNETİCİ HESABI TESTLERİ GEÇTİ' as sonuc;
rollback;
