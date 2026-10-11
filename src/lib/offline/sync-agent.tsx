"use client";

import { useEffect } from "react";

import { syncPending } from "./sync";

// Uygulama açılınca ve internet geri gelince bekleyen kayıtları gönderir.
export function SyncAgent() {
  useEffect(() => {
    void syncPending();
    const onOnline = () => void syncPending();
    const onVisible = () => document.visibilityState === "visible" && void syncPending();
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
