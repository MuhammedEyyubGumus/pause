"use client";

import { motion, useReducedMotion } from "motion/react";

import type { PathPoint, StepKind } from "./build-path";

type Props = {
  points: PathPoint[];
  d: string;
  width: number;
  height: number;
  ariaLabel: string;
  topLabel: string;
  bottomLabel: string;
};

// Adımın görünümü: davranışı yapmadıysan dolu mor, erken durduysan yarı saydam,
// gerçekleştiyse içi boş halka, sonucu yoksa küçük soluk nokta.
const DOT: Record<StepKind, { r: number; className: string }> = {
  kept: { r: 7, className: "fill-primary" },
  stopped: { r: 7, className: "fill-primary/55" },
  occurred: { r: 6, className: "fill-card stroke-muted-foreground stroke-2" },
  open: { r: 4, className: "fill-muted-foreground/40" },
};

// Kıvrılarak yükselen yol. Brief bölüm 36: yalnızca ilerleme görseli.
export function PathView({ points, d, width, height, ariaLabel, topLabel, bottomLabel }: Props) {
  const reduceMotion = useReducedMotion();
  const last = points[points.length - 1];
  // Uzun yollarda animasyon toplam ~1,6 saniyeyi geçmesin
  const delay = (i: number) => (reduceMotion ? 0 : Math.min(i * 0.02, 1.2));

  return (
    <figure className="flex flex-col gap-1">
      <span className="text-center text-xs font-semibold tracking-wide text-primary uppercase">{topLabel}</span>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={ariaLabel}>
        <motion.path
          d={d}
          fill="none"
          className="stroke-primary/25"
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduceMotion ? 0 : 1.4, ease: "easeInOut" }}
        />
        {points.map(({ x, y, event }, i) => {
          const dot = DOT[event.kind];
          return (
            <motion.g
              key={event.id}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay(i), duration: reduceMotion ? 0 : 0.25 }}
              style={{ transformOrigin: `${x}px ${y}px` }}
            >
              {event.paused && <circle cx={x} cy={y} r={11} className="fill-none stroke-primary/35" strokeWidth={1.5} />}
              <circle cx={x} cy={y} r={dot.r} className={dot.className} />
              {event.newTools.length > 0 && (
                <path
                  d={`M${x + 10} ${y - 15} l3 5 l5 3 l-5 3 l-3 5 l-3 -5 l-5 -3 l5 -3 z`}
                  className="fill-primary"
                />
              )}
            </motion.g>
          );
        })}
        {last && !reduceMotion && (
          <motion.circle
            cx={last.x}
            cy={last.y}
            r={11}
            className="fill-none stroke-primary"
            strokeWidth={2}
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.8 }}
            transition={{ delay: delay(points.length), duration: 1.8, repeat: Infinity, repeatDelay: 1 }}
            style={{ transformOrigin: `${last.x}px ${last.y}px` }}
          />
        )}
      </svg>
      <span className="text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">{bottomLabel}</span>
    </figure>
  );
}
