import "server-only";

import { notFound } from "next/navigation";

import { getSessionProfile } from "@/lib/auth";

// Yönetim sayfaları: yönetici değilse sayfa yokmuş gibi davranır (varlığını belli etmez).
// Asıl koruma veritabanındadır: tüm admin_* fonksiyonları yönetici değilse hata verir.
export async function requireAdmin() {
  const ctx = await getSessionProfile();
  const { data: isAdmin } = await ctx.supabase.rpc("is_admin");
  if (!isAdmin) notFound();
  return ctx;
}
