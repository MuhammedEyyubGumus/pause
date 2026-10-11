"use client";

import { CloudOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { localDb } from "@/lib/offline/db";
import { syncPending } from "@/lib/offline/sync";

// Cihazda olup henüz sunucuya gitmemiş kayıtlar (internetsiz kaydedilenler)
export function PendingBanner({ userId }: { userId: string }) {
  const t = useTranslations("history");
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      await syncPending();
      const n = await localDb.events.where("synced").equals(0).filter((e) => e.userId === userId).count();
      if (alive) setCount(n);
    };
    void check();
    window.addEventListener("online", check);
    return () => {
      alive = false;
      window.removeEventListener("online", check);
    };
  }, [userId]);

  if (!count) return null;
  return (
    <p className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
      <CloudOff className="size-4 shrink-0" aria-hidden />
      {t("pending", { count })}
    </p>
  );
}
