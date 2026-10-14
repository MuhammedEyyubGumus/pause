"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

// Peace Therapist logosu + PAUSE. Logo dosyası public/brand/peace-therapist-logo.png
// olarak eklenir; dosya yoksa ya da yüklenemezse aynı yerde yazıyla gösterilir.
export const BRAND_LOGO_SRC = "/brand/peace-therapist-logo.png";

export function BrandMark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const h = size === "sm" ? "h-6" : size === "lg" ? "h-10" : "h-8";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {failed ? (
        <span className="text-sm font-bold tracking-wide text-primary">PEACE THERAPIST</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- küçük, yerel bir logo; boyutu sınıfla verilir
        <img src={BRAND_LOGO_SRC} alt="Peace Therapist" className={cn(h, "w-auto")} onError={() => setFailed(true)} />
      )}
      <span aria-hidden className="h-4 w-px bg-border" />
      <span className="text-xs font-bold tracking-[0.3em] text-muted-foreground">PAUSE</span>
    </span>
  );
}
