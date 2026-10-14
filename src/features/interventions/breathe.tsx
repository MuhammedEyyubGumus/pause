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

  const size = compact ? "size-44" : "size-72";
  // Nefes egzersizinin kendisi bu hareket olduğu için "hareketi azalt" açıkken de
  // durmaz; yalnızca genliği küçülür (yavaş, tek yönlü bir büyüyüp küçülme).
  const small = reduceMotion ? 0.8 : 0.5;
  const scale = phase === "in" ? 1 : small;
  const transition = { duration: phase === "in" ? INHALE : EXHALE, ease: [0.45, 0, 0.55, 1] as const };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className={`relative grid ${size} place-items-center`}>
        {/* Dış hale: nefesle birlikte genişler */}
        <motion.div
          className="absolute inset-0 rounded-full bg-pause-ring/15"
          initial={{ scale: small }}
          animate={{ scale }}
          transition={transition}
          aria-hidden
        />
        <motion.div
          className="absolute inset-[12%] rounded-full bg-pause-ring/25"
          initial={{ scale: small }}
          animate={{ scale }}
          transition={{ ...transition, delay: 0.08 }}
          aria-hidden
        />
        {/* Çekirdek: dolu daire, sayaç içinde */}
        <motion.div
          className="absolute inset-[26%] rounded-full bg-pause-ring shadow-[0_0_48px_var(--pause-ring)]"
          initial={{ scale: small + 0.15 }}
          animate={{ scale: phase === "in" ? 1.15 : small + 0.15 }}
          transition={{ ...transition, delay: 0.16 }}
          aria-hidden
        />
        <span className={`numeric relative leading-none font-bold text-pause ${compact ? "text-3xl" : "text-5xl"}`}>
          {count}
        </span>
      </div>
      <p className={compact ? "-mt-4 text-lg font-semibold" : "-mt-2 text-2xl font-semibold"} aria-live="polite">
        {phase === "in" ? t("in") : t("out")}
      </p>

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
