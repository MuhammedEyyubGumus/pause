"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  step: number; // 0'dan başlar
  total: number;
  onBack?: () => void;
  topRight?: ReactNode; // ör. "Atla"
  footer?: ReactNode; // ana buton
  children: ReactNode;
  className?: string;
};

// Tüm adım adım akışların ortak kabuğu: üstte geri + ilerleme, ortada tek görev, altta tek buton.
export function StepShell({ step, total, onBack, topRight, footer, children, className }: Props) {
  const t = useTranslations("common");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex h-14 items-center gap-3">
        <div className="w-12">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={t("back")}
              className="tap-target-sm -ms-3 grid place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-6 rtl:rotate-180" />
            </button>
          )}
        </div>

        <div
          className="flex flex-1 items-center justify-center gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step + 1}
          aria-label={t("progress", { current: step + 1, total })}
        >
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 ease-calm",
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        <div className="flex w-12 justify-end">{topRight}</div>
      </header>

      <main className={cn("flex flex-1 flex-col py-6", className)}>{children}</main>

      {footer && <footer className="pt-2">{footer}</footer>}
    </div>
  );
}
