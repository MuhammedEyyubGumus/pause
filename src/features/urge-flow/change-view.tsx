"use client";

import { ArrowDown, ArrowUp, Equal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

// 8 → 5 · ↓3 · "Dürtü değişti."  Konfeti ve "Başardın!" yok.
export function ChangeView({ before, after }: { before: number; after: number }) {
  const t = useTranslations("urge");
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? after : before);
  const delta = after - before;

  // Rakam önceki değerden yeni değere sayarak iner/çıkar
  useEffect(() => {
    if (reduceMotion || shown === after) return;
    const id = setTimeout(() => setShown((s) => s + Math.sign(after - s)), shown === before ? 600 : 140);
    return () => clearTimeout(id);
  }, [shown, after, before, reduceMotion]);

  const settled = shown === after;
  const Icon = delta < 0 ? ArrowDown : delta > 0 ? ArrowUp : Equal;
  const title = delta < 0 ? t("changeDown") : delta > 0 ? t("changeUp") : t("changeSame");
  const sub = delta > 0 ? t("changeUpSub") : delta === 0 ? t("changeSameSub") : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <div className="flex items-baseline gap-4">
        <span className="numeric text-5xl font-bold text-muted-foreground">{before}</span>
        <span className="text-2xl text-muted-foreground">→</span>
        <span className="text-hero numeric">{shown}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={settled ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-3"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-lg font-bold text-change-positive">
          <Icon className="size-5" strokeWidth={2.5} aria-hidden />
          <span className="numeric">{Math.abs(delta)}</span>
        </span>
        <p className="text-question">{title}</p>
        {sub && <p className="max-w-xs text-muted-foreground">{sub}</p>}
      </motion.div>
    </div>
  );
}
