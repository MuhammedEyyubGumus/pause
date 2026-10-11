"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const DURATION = 90; // saniye
const W = 320;
const H = 140;

// Dalganın yüksekliği: 0'dan başlar, ortada tepe yapar, sonra iner.
function waveY(t: number) {
  return H - 16 - Math.sin(Math.PI * t) ** 2 * (H - 40);
}

const path = Array.from({ length: 61 }, (_, i) => {
  const t = i / 60;
  return `${i === 0 ? "M" : "L"}${(t * W).toFixed(1)} ${waveY(t).toFixed(1)}`;
}).join(" ");

// Dürtüyü gözlemle (urge surfing): 90 saniyelik bir dalga yükselir, tepe yapar ve iner.
export function UrgeSurf({ onFinish }: { onFinish: (details: { seconds: number }) => void }) {
  const t = useTranslations("interventions.urgeSurf");
  const reduceMotion = useReducedMotion();
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.min(DURATION, (Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const p = elapsed / DURATION;
  const x = p * W;
  const y = waveY(p);
  const finished = elapsed >= DURATION;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <h2 className="text-question">{t("title")}</h2>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm" aria-hidden>
        <path d={`${path} L${W} ${H} L0 ${H} Z`} fill="var(--pause-ring)" fillOpacity={0.12} />
        <path d={path} fill="none" stroke="var(--pause-ring)" strokeOpacity={0.35} strokeWidth={2} />
        {/* Geçilen kısım */}
        <clipPath id="surf-progress">
          <rect x={0} y={0} width={x} height={H} />
        </clipPath>
        <path d={path} fill="none" stroke="var(--pause-ring)" strokeWidth={4} strokeLinecap="round" clipPath="url(#surf-progress)" />
        <motion.circle
          cx={x}
          cy={y}
          r={9}
          fill="var(--pause-foreground)"
          animate={reduceMotion ? undefined : { r: [8, 10, 8] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </svg>

      <div className="flex max-w-xs flex-col gap-2">
        <p className="text-lg font-semibold">{t("body")}</p>
        <p className="opacity-70">{t("hint")}</p>
      </div>

      <button
        type="button"
        onClick={() => onFinish({ seconds: Math.round(elapsed) })}
        className={
          finished
            ? "tap-target w-full max-w-xs rounded-xl bg-pause-foreground px-8 text-lg font-semibold text-pause"
            : "tap-target rounded-xl bg-pause-foreground/10 px-8 font-semibold"
        }
      >
        {t("finish")}
      </button>
    </div>
  );
}
