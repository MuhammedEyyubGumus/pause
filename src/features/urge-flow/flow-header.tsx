"use client";

import { ArrowLeft, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { formatClock } from "./use-pause-clock";

type Props = {
  onBack?: () => void;
  onClose?: () => void;
  remainingMs?: number | null; // pause sürüyorsa küçük saat
  tone?: "default" | "pause";
};

export function FlowHeader({ onBack, onClose, remainingMs, tone = "default" }: Props) {
  const t = useTranslations("urge");
  const tc = useTranslations("common");
  const quiet = tone === "pause" ? "text-pause-foreground/70 hover:text-pause-foreground" : "text-muted-foreground hover:text-foreground";

  return (
    <header className="flex h-14 items-center justify-between">
      <div className="w-12">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={tc("back")}
            className={cn("tap-target-sm -ms-3 grid place-items-center rounded-full transition-colors", quiet)}
          >
            <ArrowLeft className="size-6 rtl:rotate-180" />
          </button>
        )}
      </div>

      {remainingMs != null && (
        <span
          className={cn(
            "numeric rounded-full px-3 py-1 text-sm font-semibold",
            tone === "pause" ? "bg-pause-foreground/10" : "bg-accent text-accent-foreground",
          )}
          aria-live="off"
        >
          {formatClock(remainingMs)}
        </span>
      )}

      <div className="flex w-12 justify-end">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className={cn("tap-target-sm -me-3 grid place-items-center rounded-full transition-colors", quiet)}
          >
            <X className="size-6" />
          </button>
        )}
      </div>
    </header>
  );
}
