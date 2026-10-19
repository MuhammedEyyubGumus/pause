"use client";

import { motion, useReducedMotion } from "motion/react";

// Check-in adımlarında ince ilerleme çizgisi: "15 saniyelik bir süreçten geçiyorum" hissi.
// Sayı yazmaz; kaç adım kaldığını sezdirmek yeterli.
export function StepProgress({ index, total, label }: { index: number; total: number; label: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={index + 1}
      className="flex gap-1.5 pb-1"
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.span
            className="block h-full origin-left rounded-full bg-primary rtl:origin-right"
            initial={false}
            animate={{ scaleX: i <= index ? 1 : 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        </span>
      ))}
    </div>
  );
}
