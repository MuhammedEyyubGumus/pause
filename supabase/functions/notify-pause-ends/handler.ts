import { sendWebPush, type VapidKeys } from "./webpush.ts";

// Bildirim metni: davranışın adı geçmez (kilit ekranında başkası görebilir).
const MESSAGES: Record<string, { title: string; body: string }> = {
  tr: { title: "Süre doldu", body: "Dürtü şimdi nasıl? Birlikte bakalım." },
  en: { title: "Time is up", body: "How is the urge now? Let's check together." },
};

type Due = { event_id: string; user_id: string };
type Sub = { user_id: string; endpoint: string; p256dh: string; auth: string; locale: string };

// Test edilebilsin diye Supabase istemcisinin yalnızca kullandığımız kısmı
export type Db = {
  claimDue(): Promise<Due[]>;
  subscriptionsFor(userIds: string[]): Promise<Sub[]>;
  removeSubscription(userId: string, endpoint: string): Promise<void>;
  markSuccess(userId: string, endpoint: string): Promise<void>;
};

export async function notifyDuePauses(db: Db, vapid: VapidKeys) {
  const due = await db.claimDue();
  if (!due.length) return { due: 0, sent: 0, removed: 0, failed: 0 };

  const subs = await db.subscriptionsFor([...new Set(due.map((d) => d.user_id))]);
  let sent = 0;
  let removed = 0;
  let failed = 0;

  await Promise.all(
    due.flatMap((d) =>
      subs
        .filter((s) => s.user_id === d.user_id)
        .map(async (s) => {
          const m = MESSAGES[s.locale] ?? MESSAGES.tr;
          const payload = JSON.stringify({
            title: m.title,
            body: m.body,
            url: `/pause/${d.event_id}`,
            tag: `pause-${d.event_id}`,
          });
          try {
            const res = await sendWebPush(s, payload, vapid, { ttl: 900, urgency: "high" });
            if (res.status === 404 || res.status === 410) {
              // Tarayıcı aboneliği iptal etmiş: bir daha deneme
              await db.removeSubscription(s.user_id, s.endpoint);
              removed++;
            } else if (res.ok) {
              await db.markSuccess(s.user_id, s.endpoint);
              sent++;
            } else {
              failed++;
              console.warn("push failed", res.status, await res.text().catch(() => ""));
            }
          } catch (error) {
            failed++;
            console.warn("push error", error);
          }
        }),
    ),
  );

  return { due: due.length, sent, removed, failed };
}
