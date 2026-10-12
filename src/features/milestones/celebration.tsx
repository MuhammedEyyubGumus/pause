"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { MilestoneIcon } from "./icons";
import type { MilestoneKey } from "./shared";

// Yeni kilometre taşı kutlaması: sakin, tam ekran, tek dokunuşla kapanır.
// "Başardın!" gibi çocuksu bir dil yok (brief bölüm 15); taşın ne anlama geldiği söylenir.
export function MilestoneCelebration({
  userId,
  milestone,
  more,
  achieved,
}: {
  userId: string;
  milestone: MilestoneKey;
  more: number; // aynı anda kazanılmış diğer yeni taşlar
  achieved: MilestoneKey[]; // kutlandı olarak işaretlenecek tüm taşlar
}) {
  const t = useTranslations("milestones");
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(true);

  function close() {
    setOpen(false);
    // Kutlandı olarak işaretle; ağ yoksa bir sonraki açılışta tekrar görünür (sorun değil)
    void createClient().from("profiles").update({ celebrated_milestones: achieved }).eq("id", userId);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="milestone-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col bg-pause text-pause-foreground"
        >
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-6 pt-safe text-center">
            {/* Yayılan halkalar */}
            <div className="relative grid size-40 place-items-center" aria-hidden>
              {!reduceMotion &&
                [0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-pause-ring"
                    initial={{ scale: 0.4, opacity: 0.8 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    transition={{ duration: 2.4, delay: i * 0.8, repeat: Infinity, ease: "easeOut" }}
                  />
                ))}
              <motion.span
                initial={reduceMotion ? false : { scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.15 }}
                className="relative grid size-24 place-items-center rounded-full bg-pause-ring text-pause"
              >
                <MilestoneIcon name={milestone} className="size-11" />
              </motion.span>
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3"
            >
              <p className="text-sm font-semibold tracking-wide uppercase opacity-70">{t("newEyebrow")}</p>
              <h1 id="milestone-title" className="text-[2rem] leading-tight font-bold text-balance">
                {t(`items.${milestone}.title`)}
              </h1>
              <p className="text-lg opacity-80">{t(`items.${milestone}.body`)}</p>
              {more > 0 && <p className="text-sm opacity-70">{t("andMore", { count: more })}</p>}
            </motion.div>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-6 pb-safe">
            <button
              type="button"
              onClick={close}
              autoFocus
              className="tap-target w-full rounded-xl bg-pause-ring text-lg font-semibold text-pause"
            >
              {t("continue")}
            </button>
            <Link
              href="/milestones"
              onClick={close}
              className="tap-target-sm text-center text-sm font-semibold opacity-80 hover:opacity-100"
            >
              {t("seeAll")}
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
