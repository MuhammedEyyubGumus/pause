"use client";

import { createClient } from "@/lib/supabase/client";
import { uuid } from "@/lib/uuid";

// Anonim ürün ölçümü (brief bölüm 41). Kişisel davranış verisi DEĞİLDİR:
//  * Hesap kimliği gönderilmez; olaylar yalnızca bu sayfa açıklığı boyunca geçerli
//    rastgele bir oturum kimliğiyle gruplanır (uygulama yeniden açılınca değişir).
//  * Yalnızca aşağıdaki olay adları ve küçük teknik özellikler (adım adı, mod,
//    sistem alternatifinin anahtarı) gönderilir. Serbest metin, davranış adı,
//    duygu/tetikleyici gönderilmez.
//  * Kullanıcı Ayarlar'dan kapatabilir. Ağ yoksa olay sessizce düşer; akış hiç beklemez.

export type AppEventName =
  | "app_opened"
  | "onboarding_step"
  | "onboarding_completed"
  | "urge_flow_started"
  | "urge_step"
  | "pause_completed"
  | "urge_flow_completed"
  | "intervention_started"
  | "intervention_completed"
  | "review_started"
  | "review_completed"
  | "insights_viewed"
  | "weekly_review_opened"
  | "feedback_sent"
  | "push_enabled";

type Props = Record<string, string | number | boolean | null>;

const OPT_OUT_KEY = "pause:analytics-off";
let sessionId: string | null = null;

function getSessionId() {
  if (!sessionId) sessionId = uuid();
  return sessionId;
}

export function analyticsEnabled() {
  try {
    return localStorage.getItem(OPT_OUT_KEY) !== "1";
  } catch {
    return true;
  }
}

export function setAnalyticsEnabled(on: boolean) {
  try {
    if (on) localStorage.removeItem(OPT_OUT_KEY);
    else localStorage.setItem(OPT_OUT_KEY, "1");
  } catch {
    // gizli sekme
  }
}

export function track(name: AppEventName, props: Props = {}) {
  if (typeof window === "undefined" || !analyticsEnabled()) return;
  if (!navigator.onLine) return;
  void createClient()
    .from("app_events")
    .insert({
      session_id: getSessionId(),
      name,
      props,
      app_version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
    })
    .then(({ error }) => {
      if (error && process.env.NODE_ENV !== "production") console.warn("[pause] track", name, error.message);
    });
}
