import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Giriş gerektirmeyen yollar
const PUBLIC_PATHS = ["/login", "/auth", "/~offline", "/privacy", "/admin/login"];
// Yönetici hesabının da açabileceği uygulama dışı yollar
const ADMIN_ALLOWED = ["/admin", "/auth", "/privacy", "/~offline"];
// Giriş yapmış kullanıcının görmesine gerek olmayan yollar
const GUEST_ONLY_PATHS = ["/login"];

function matches(path: string, list: string[]) {
  return list.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Oturumu yeniler. createServerClient ile bu satır arasına kod koyma.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && !matches(path, PUBLIC_PATHS)) {
    const url = request.nextUrl.clone();
    // Yönetim sayfalarına girişsiz gelen, yönetici giriş ekranına
    url.pathname = matches(path, ["/admin"]) ? "/admin/login" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Yönetici hesabı uygulamayı kullanmaz: dürtü, geçmiş, onboarding yok; her zaman panel.
  // Rol giriş anahtarında (app_metadata) taşınır, kullanıcı kendisi değiştiremez.
  // Asıl yetki kontrolü veritabanında (admin_* fonksiyonları) ayrıca yapılır.
  const isAdmin = user?.app_metadata?.role === "admin";
  if (user && isAdmin && (!matches(path, ADMIN_ALLOWED) || path === "/admin/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && !isAdmin && matches(path, GUEST_ONLY_PATHS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
