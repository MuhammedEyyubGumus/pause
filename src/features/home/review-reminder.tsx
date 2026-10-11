"use client";

import { Link2, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const KEY = (id: string) => `pause:review-dismissed:${id}`;

// "Daha sonra" denilen zincir incelemesini bir kez, sakin bir kartla hatırlatır.
// Kapatılırsa o olay için bir daha gösterilmez (yalnızca bu cihazda).
export function ReviewReminder({ eventId }: { eventId: string }) {
  const t = useTranslations("reflect");
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY(eventId)) === "1");
    } catch {
      setHidden(false);
    }
  }, [eventId]);

  if (hidden) return null;

  return (
    <aside className="relative flex items-center gap-3 rounded-card bg-card p-4 pe-12 shadow-[0_1px_2px_oklch(0_0_0/0.04)]">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
        <Link2 className="size-5" aria-hidden />
      </span>
      <Link href={`/reflect/${eventId}`} className="flex flex-1 flex-col after:absolute after:inset-0">
        <span className="font-semibold">{t("reminderTitle")}</span>
        <span className="text-sm text-muted-foreground">{t("reminderBody")}</span>
      </Link>
      <button
        type="button"
        aria-label={t("reminderDismiss")}
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(KEY(eventId), "1");
          } catch {
            // gizli sekme
          }
        }}
        className="tap-target-sm absolute end-1 top-1/2 z-10 grid -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
      >
        <X className="size-5" />
      </button>
    </aside>
  );
}
