-- PAUSE · Yönetici hesabı kurulumu (SQL Editor'da çalıştır)
--
-- 1) Önce Supabase panelinde hesabı oluştur:
--    Authentication > Users > Add user > Create new user
--    E-posta: yönetici e-postan (ör. admin@peacetherapist.com) · Şifre: güçlü bir şifre
--    "Auto Confirm User" işaretli olsun.
--
-- 2) Sonra bu hesabı yönetici yap:
select public.grant_admin('YONETICI-EPOSTASI');

-- Kişisel hesabını daha önce yönetici yaptıysan, uygulamayı normal kullanabilmesi için geri al:
-- select public.revoke_admin('KISISEL-EPOSTAN');

-- Kontrol: kimler yönetici?
-- select u.email from public.admins a join auth.users u on u.id = a.user_id;
