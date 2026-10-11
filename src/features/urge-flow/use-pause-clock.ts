"use client";

import { useEffect, useState } from "react";

// Timer hiçbir zaman "geri sayan bir sayaç" değildir: kalan süre her an
// bitiş zamanından yeniden hesaplanır. Uygulama kapanıp açılsa, telefon
// kilitlense ya da sekme uyutulsa da süre doğru kalır.
export function usePauseClock(startedAt: string | null | undefined, endsAt: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [endsAt]);

  const start = startedAt ? Date.parse(startedAt) : now;
  const end = endsAt ? Date.parse(endsAt) : now;
  const total = Math.max(1, end - start);
  const remainingMs = Math.max(0, end - now);

  return {
    remainingMs,
    progress: Math.min(1, Math.max(0, 1 - remainingMs / total)),
    done: !!endsAt && remainingMs === 0,
  };
}

export function formatClock(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
