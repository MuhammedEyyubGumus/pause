"use client";

import { useEffect } from "react";

import { type AppEventName, track } from "@/lib/analytics";

let appOpenedSent = false;

// Sunucu sayfalarından anonim "görüntülendi" olayı göndermek için.
// app_opened sayfa açıklığı başına yalnızca bir kez gider.
export function TrackView({ name, props }: { name: AppEventName; props?: Record<string, string | number | boolean | null> }) {
  const key = JSON.stringify(props ?? {});
  useEffect(() => {
    if (name === "app_opened") {
      if (appOpenedSent) return;
      appOpenedSent = true;
    }
    track(name, props);
    // props içeriği değişince yeniden gönder
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, key]);
  return null;
}
