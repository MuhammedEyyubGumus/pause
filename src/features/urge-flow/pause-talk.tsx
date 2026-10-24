"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

// PAUSE'un kısa mesajı: önce "yazıyor" noktaları, sonra cümleler tek tek belirir.
// Bir kez gösterildikten sonra (geri dönüldüğünde) animasyonsuz görünür.
export function PauseTalk({
  lines,
  why,
  animate,
  onShown,
}: {
  lines: string[];
  why: string | null;
  animate: boolean;
  onShown: () => void;
}) {
  const t = useTranslations("urge.talk");
  const reduceMotion = useReducedMotion();
  const play = animate && !reduceMotion;
  const [typing, setTyping] = useState(play);

  useEffect(() => {
    if (!play) {
      onShown();
      return;
    }
    const id = setTimeout(() => {
      setTyping(false);
      onShown();
    }, 700);
    return () => clearTimeout(id);
    // Yalnızca ilk gösterimde
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex items-start gap-3" aria-label={t("name")} aria-live="polite">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card shadow-sm ring-1 ring-primary/20">
        {/* eslint-disable-next-line @next/next/no-img-element -- küçük yerel marka sembolü */}
        <img src="/brand/peace-therapist-symbol.png" alt="" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs font-bold tracking-[0.2em] text-primary">{t("name")}</span>
        <div className="rounded-2xl rounded-ss-sm bg-accent px-4 py-3 text-accent-foreground">
          {typing ? (
            <span className="flex h-6 items-center gap-1" aria-label={t("typing")}>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="size-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {lines.map((line, i) => (
                <motion.p
                  key={line}
                  initial={play ? { opacity: 0, y: 4 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: play ? i * 0.35 : 0, duration: 0.3 }}
                  className="leading-snug"
                >
                  {line}
                </motion.p>
              ))}
              {why && (
                <motion.p
                  initial={play ? { opacity: 0, y: 4 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: play ? lines.length * 0.35 : 0, duration: 0.3 }}
                  className="mt-1 border-s-2 border-primary/40 ps-3 text-sm"
                >
                  <span className="font-semibold">{t("whyIntro")} </span>
                  <span className="italic">“{why}”</span>
                </motion.p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
