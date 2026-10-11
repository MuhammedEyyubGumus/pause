// Ayarlar > "Hesabımı sil": kullanıcının hesabını ve TÜM verisini kalıcı olarak siler.
//  1. Depolamadaki ekran görüntüleri (feedback/<user_id>/...)
//  2. auth.users satırı -> veritabanındaki tüm tablolar "on delete cascade" ile silinir
// Yalnızca isteği yapan kullanıcının kendi hesabı silinebilir.
import { adminClient, CORS_HEADERS, json, requestUser } from "../_shared/user-request.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = adminClient();
  const user = await requestUser(req, admin);
  if (!user) return json({ error: "unauthorized" }, 401);

  // Yanlışlıkla çağrılmasın: açık onay gerekli
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "DELETE") return json({ error: "confirmation_required" }, 400);

  // 1) Ekran görüntüleri
  const { data: files } = await admin.storage.from("feedback").list(user.id, { limit: 1000 });
  if (files?.length) {
    await admin.storage.from("feedback").remove(files.map((f) => `${user.id}/${f.name}`));
  }

  // 2) Hesap + tüm veriler
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("delete user failed", error);
    return json({ error: "delete_failed" }, 500);
  }

  return json({ deleted: true });
});
