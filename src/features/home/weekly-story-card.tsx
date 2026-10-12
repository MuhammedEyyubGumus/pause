"use client";

import { CirclePlay } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

// Geçen haftanın hikâyesi hazırsa ve bu cihazda henüz açılmadıysa gösterilir.
export function WeeklyStoryCard({ week, urges }: { week: string; urges: number }) {
  const t = useTranslations("review");
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(`pause:review-seen:${week}`) === "1");
    } catch {
      setSeen(false);
    }
  }, [week]);

  if (seen) return null;

  return (
    <Link
      href="/review"
      className="flex items-center gap-3 rounded-card bg-pause p-4 text-pause-foreground shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-transform active:scale-[0.98]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pause-ring text-pause">
        <CirclePlay className="size-5" aria-hidden />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">{t("cardTitle")}</span>
        <span className="text-sm opacity-80">{t("cardBody", { count: urges })}</span>
      </span>
    </Link>
  );
}
