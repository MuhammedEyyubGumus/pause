"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

// Peace Therapist logosu (barış sembolü + "peace THERAPIST") ve yanında PAUSE.
// Logo şeffaf PNG olarak public/brand altında durur; yüklenemezse aynı yerde yazı gösterilir.
export const BRAND_LOGO_SRC = "/brand/peace-therapist-logo.png";
export const BRAND_SYMBOL_SRC = "/brand/peace-therapist-symbol.png";

// Logo oranı yaklaşık 10:1; yükseklik boyuta göre seçilir
const HEIGHT = { sm: "h-4", md: "h-5", lg: "h-7" } as const;

export function BrandMark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false);

  const stacked = size === "lg";
  const logo = failed ? (
    <span className="text-sm font-bold tracking-wide text-primary">PEACE THERAPIST</span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- küçük, yerel bir logo; boyutu sınıfla verilir
    <img
      src={BRAND_LOGO_SRC}
      alt="Peace Therapist"
      className={cn(HEIGHT[size], "w-auto max-w-full shrink")}
      onError={() => setFailed(true)}
    />
  );

  // Büyük boyutta (giriş ekranları) PAUSE logonun altına gelir; dar telefonlara sığar
  if (stacked) {
    return (
      <span className={cn("inline-flex max-w-full flex-col items-center gap-2", className)}>
        {logo}
        <span className="text-sm font-bold tracking-[0.4em] text-primary">PAUSE</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      {logo}
      <span aria-hidden className="h-4 w-px shrink-0 bg-border" />
      <span className="shrink-0 text-xs font-bold tracking-[0.3em] text-primary">PAUSE</span>
    </span>
  );
}
