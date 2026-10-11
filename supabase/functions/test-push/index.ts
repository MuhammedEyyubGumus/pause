// Ayarlar > "Test bildirimi gönder": kullanıcının kendi cihazlarına bir deneme bildirimi.
// Böylece kullanıcı, bildirimin telefonunda/bilgisayarında gerçekten göründüğünü kontrol edebilir.
import { adminClient, CORS_HEADERS, json, requestUser } from "../_shared/user-request.ts";
import { sendWebPush } from "../notify-pause-ends/webpush.ts";

const MESSAGES: Record<string, { title: string; body: string }> = {
  tr: { title: "PAUSE", body: "Bildirimler çalışıyor. Süre dolunca sana böyle haber vereceğim." },
  en: { title: "PAUSE", body: "Notifications work. This is how I'll let you know when time is up." },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = adminClient();
  const user = await requestUser(req, admin);
  if (!user) return json({ error: "unauthorized" }, 401);

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, locale")
    .eq("user_id", user.id);
  if (error) return json({ error: "db" }, 500);
  if (!subs?.length) return json({ error: "no_subscription", sent: 0 }, 404);

  const vapid = {
    publicKey: Deno.env.get("VAPID_PUBLIC_KEY")!,
    privateKey: Deno.env.get("VAPID_PRIVATE_KEY")!,
    subject: Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@example.com",
  };

  let sent = 0;
  let removed = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      const m = MESSAGES[s.locale] ?? MESSAGES.tr;
      try {
        const res = await sendWebPush(
          s,
          JSON.stringify({ title: m.title, body: m.body, url: "/settings", tag: "pause-test" }),
          vapid,
          { ttl: 60, urgency: "high" },
        );
        if (res.status === 404 || res.status === 410) {
          await admin.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", s.endpoint);
          removed++;
        } else if (res.ok) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }),
  );

  return json({ sent, removed, failed });
});
