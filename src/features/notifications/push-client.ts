"use client";

import { createClient } from "@/lib/supabase/client";

// Bildirim durumu:
//  unsupported   tarayıcı desteklemiyor
//  needs-install iPhone/iPad: önce Safari'den "Ana Ekrana Ekle" gerekiyor
//  denied        kullanıcı reddetmiş (yalnızca tarayıcı ayarlarından açılabilir)
//  default       henüz sorulmadı / kapalı
//  subscribed    açık
export type PushState = "unsupported" | "needs-install" | "denied" | "default" | "subscribed";

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function supported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function registration(timeoutMs = 6000): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

function b64urlToBytes(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function getPushState(): Promise<PushState> {
  if (!supported()) return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "default";
  const reg = await registration(3000);
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "subscribed" : "default";
}

export async function enablePush(locale: string): Promise<PushState> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY tanımlı değil");
  if (!supported()) return isIos() && !isStandalone() ? "needs-install" : "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "default";

  const reg = await registration();
  if (!reg) throw new Error("Service worker hazır değil");

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64urlToBytes(key) as unknown as BufferSource,
    });
  }

  const json = sub.toJSON();
  const { error } = await createClient()
    .from("push_subscriptions")
    .upsert(
      {
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
        locale,
        user_agent: navigator.userAgent.slice(0, 300),
      },
      { onConflict: "user_id,endpoint" },
    );
  if (error) throw error;
  return "subscribed";
}

export async function disablePush(): Promise<PushState> {
  const reg = await registration(3000);
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
  return "default";
}
