"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const INHALE = 4;
const EXHALE = 6;

type Props = {
  onFinish?: (details: { rounds: number }) => void;
  compact?: boolean; // SOS ekranında timer'ın altında küçük hali
};

// Tam ekran nefes: 4 saniye al (daire büyür), 6 saniye ver (daire küçülür).
export function Breathe({ onFinish, compact = false }: Props) {
  const t = useTranslations("interventions.breathe");
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [count, setCount] = useState(INHALE);
  const [rounds, setRounds] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      if (count > 1) {
        setCount((c) => c - 1);
        return;
      }
      if (phase === "in") {
        setPhase("out");
        setCount(EXHALE);
        navigator.vibrate?.(8);
      } else {
        setPhase("in");
        setCount(INHALE);
        setRounds((r) => r + 1);
        navigator.vibrate?.(8);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [count, phase]);

  const size = compact ? "size-40" : "size-64";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className={`relative grid ${size} place-items-center`}>
        <motion.div
          className="absolute inset-0 rounded-full bg-pause-ring/25"
          animate={reduceMotion ? { scale: 0.85 } : { scale: phase === "in" ? 1 : 0.55 }}
          initial={false}
          transition={{ duration: phase === "in" ? INHALE : EXHALE, ease: [0.45, 0, 0.55, 1] }}
          aria-hidden
        />
        <motion.div
          className="absolute inset-[18%] rounded-full bg-pause-ring/40"
          animate={reduceMotion ? { scale: 0.85 } : { scale: phase === "in" ? 1 : 0.6 }}
          initial={false}
          transition={{ duration: phase === "in" ? INHALE : EXHALE, ease: [0.45, 0, 0.55, 1] }}
          aria-hidden
        />
        <div className="relative flex flex-col items-center" aria-live="polite">
          <span className={compact ? "text-lg font-semibold" : "text-2xl font-semibold"}>
            {phase === "in" ? t("in") : t("out")}
          </span>
          <span className={`numeric font-bold ${compact ? "text-3xl" : "text-5xl"}`}>{count}</span>
        </div>
      </div>

      {!compact && (
        <>
          <p className="text-sm opacity-70">{t("rounds", { count: rounds })}</p>
          {onFinish && (
            <button
              type="button"
              onClick={() => onFinish({ rounds })}
              className="tap-target rounded-xl bg-pause-foreground/10 px-8 font-semibold transition-colors hover:bg-pause-foreground/15"
            >
              {t("finish")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
