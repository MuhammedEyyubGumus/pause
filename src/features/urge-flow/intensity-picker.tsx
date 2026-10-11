"use client";

import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";

type Props = {
  value: number;
  onChange: (v: number) => void;
  title: string;
  lowLabel: string;
  highLabel: string;
  ariaLabel: string;
};

// Tam ekran şiddet ölçümü: ortada büyük rakam, arkasında değere göre
// büyüyen ve sıcaklaşan bir küre. Kırmızı alarm yok.
export function IntensityPicker({ value, onChange, title, lowLabel, highLabel, ariaLabel }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = 0.7 + value * 0.045;
  // Değer yükseldikçe küre biraz daha hızlı "nefes alır"
  const pulseSeconds = Math.max(1.6, 4 - value * 0.24);

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-question text-center text-balance">{title}</h1>

      <div className="relative my-6 grid flex-1 place-items-center" style={{ "--urge": value } as CSSProperties}>
        <motion.div
          className="bg-urge absolute size-56 rounded-full opacity-70 blur-[2px]"
          animate={reduceMotion ? { scale } : { scale: [scale, scale * 1.04, scale] }}
          transition={reduceMotion ? { duration: 0.2 } : { duration: pulseSeconds, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
        <motion.span
          key={value}
          initial={reduceMotion ? false : { y: 8, opacity: 0.4 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="text-hero numeric relative"
          aria-hidden
        >
          {value}
        </motion.span>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          aria-label={ariaLabel}
          aria-valuetext={`${value} / 10`}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v !== value) navigator.vibrate?.(4);
            onChange(v);
          }}
          className="urge-range"
          style={{ "--fill": `${value * 10}%` } as CSSProperties}
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>0 · {lowLabel}</span>
          <span>{highLabel} · 10</span>
        </div>
      </div>
    </div>
  );
}
