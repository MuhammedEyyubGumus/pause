"use client";

import { CirclePlay, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

// Geçen haftanın hikâyesi hazırsa ve bu cihazda sonuna kadar okunmadıysa / gizlenmediyse gösterilir.
export function WeeklyStoryCard({ week, urges }: { week: string; urges: number }) {
  const t = useTranslations("review");
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(`pause:review-done:${week}`) === "1");
    } catch {
      setSeen(false);
    }
  }, [week]);

  if (seen) return null;

  function dismiss() {
    setSeen(true);
    try {
      localStorage.setItem(`pause:review-done:${week}`, "1");
    } catch {
      // gizli sekme
    }
  }

  return (
    <div className="relative">
      <Link
        href="/review"
        className="flex items-center gap-3 rounded-card bg-pause p-4 pe-12 text-pause-foreground shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-transform active:scale-[0.98]"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pause-ring text-pause">
          <CirclePlay className="size-5" aria-hidden />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="font-semibold">{t("cardTitle")}</span>
          <span className="text-sm opacity-80">{t("cardBody", { count: urges })}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("cardDismiss")}
        className="tap-target-sm absolute end-1 top-1/2 grid -translate-y-1/2 place-items-center rounded-full text-pause-foreground/70 hover:text-pause-foreground"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
