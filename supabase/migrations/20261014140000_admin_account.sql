-- PAUSE · Migration 014: Ayrı yönetici hesabı
-- Yönetici artık uygulamayı kullanan bir kişi değil, yalnızca paneli gören ayrı bir hesap
-- (ör. admin@...). Bu hesap şifreyle /admin/login'den girer; dürtü akışı, onboarding vb. görmez.
--
-- Yönetici olmak iki yerde işaretlenir (ikisini birlikte grant_admin yapar):
--   * public.admins tablosu  — veritabanı yetkisi (admin_* fonksiyonları buna bakar)
--   * auth.users.raw_app_meta_data.role = 'admin' — giriş anahtarında taşınır; sayfa yönlendirmesi
--     (yöneticiyi her zaman panele götürmek) için ek sorgu gerekmez.
-- app_metadata'yı kullanıcı kendisi değiştiremez; yalnızca SQL Editor / service role.

create or replace function public.grant_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then
    return 'Bu e-postayla bir kullanıcı yok: ' || p_email;
  end if;
  insert into public.admins (user_id) values (v_id) on conflict do nothing;
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
   where id = v_id;
  return 'Yönetici yapıldı: ' || p_email || ' (açık oturum varsa çıkış yapıp tekrar girin)';
end;
$$;

create or replace function public.revoke_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then
    return 'Bu e-postayla bir kullanıcı yok: ' || p_email;
  end if;
  delete from public.admins where user_id = v_id;
  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role' where id = v_id;
  return 'Yöneticilik kaldırıldı: ' || p_email;
end;
$$;

-- Yalnızca SQL Editor'dan (postgres) çağrılabilir; uygulama kullanıcıları çağıramaz
revoke all on function public.grant_admin(text) from public, anon, authenticated;
revoke all on function public.revoke_admin(text) from public, anon, authenticated;

-- Daha önce tabloya eklenmiş yöneticilerin anahtarına da rol yazılsın
update auth.users u
   set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
 where exists (select 1 from public.admins a where a.user_id = u.id);
