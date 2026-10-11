"use client";

import { ChartNoAxesColumn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { analyticsEnabled, setAnalyticsEnabled } from "@/lib/analytics";

// Anonim kullanım istatistiklerini kapatma anahtarı (yalnızca bu cihaz)
export function AnalyticsSetting() {
  const t = useTranslations("settings");
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    setOn(analyticsEnabled());
  }, []);

  if (on === null) return <div className="h-16 rounded-xl bg-card" />;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
        <ChartNoAxesColumn className="size-5" aria-hidden />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">{t("analyticsTitle")}</span>
        <span className="text-sm text-muted-foreground">{t("analyticsHint")}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t("analyticsTitle")}
        onClick={() => {
          setAnalyticsEnabled(!on);
          setOn(!on);
        }}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-border"}`}
      >
        <span
          className={`absolute top-1 size-6 rounded-full bg-card shadow transition-[inset-inline-start] duration-200 ${on ? "start-7" : "start-1"}`}
        />
      </button>
    </div>
  );
}
