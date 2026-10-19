"use client";

import { motion, useReducedMotion } from "motion/react";

// Kayıt bittiğinde: soluk bir yolun ucuna yeni bir nokta eklenir.
// Yalnızca ilerleme görseli; "beynini ölçüyoruz" izlenimi vermez (brief bölüm 36).
const POINTS: [number, number][] = [
  [20, 92],
  [58, 70],
  [92, 84],
  [128, 52],
  [164, 62],
];
const NEW: [number, number] = [200, 30];

export function GrowingPath() {
  const reduceMotion = useReducedMotion();
  const last = POINTS[POINTS.length - 1];
  const path = POINTS.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const d = (s: number) => (reduceMotion ? 0 : s);

  return (
    <svg viewBox="0 0 220 112" className="h-28 w-56 text-primary" aria-hidden>
      {/* Eski yol */}
      <motion.path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.22}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: d(0.9), ease: "easeOut" }}
      />
      {POINTS.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r={4}
          fill="currentColor"
          fillOpacity={0.3}
          initial={reduceMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: d(0.1 + i * 0.12), duration: d(0.3) }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      ))}
      {/* Yeni bağlantı */}
      <motion.line
        x1={last[0]}
        y1={last[1]}
        x2={NEW[0]}
        y2={NEW[1]}
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        initial={reduceMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: d(1), duration: d(0.5), ease: "easeOut" }}
      />
      <motion.circle
        cx={NEW[0]}
        cy={NEW[1]}
        r={14}
        fill="currentColor"
        fillOpacity={0.15}
        initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
        animate={reduceMotion ? { scale: 1, opacity: 1 } : { scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
        transition={{ delay: d(1.45), duration: d(0.7) }}
        style={{ transformOrigin: `${NEW[0]}px ${NEW[1]}px` }}
      />
      <motion.circle
        cx={NEW[0]}
        cy={NEW[1]}
        r={7}
        fill="currentColor"
        initial={reduceMotion ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: d(1.45), type: "spring", stiffness: 400, damping: 18 }}
        style={{ transformOrigin: `${NEW[0]}px ${NEW[1]}px` }}
      />
    </svg>
  );
}
