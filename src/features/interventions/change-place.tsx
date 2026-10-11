"use client";

import { DoorOpen } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

// Kalk, başka bir yere geç, dönünce dokun.
export function ChangePlace({ onFinish }: { onFinish: (details: Record<string, unknown>) => void }) {
  const t = useTranslations("interventions.changePlace");
  const reduceMotion = useReducedMotion();
  const lines = [t("l1"), t("l2"), t("l3")];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
      <motion.span
        className="grid size-24 place-items-center rounded-full bg-pause-foreground/10"
        animate={reduceMotion ? undefined : { rotateY: [0, -35, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        <DoorOpen className="size-12" strokeWidth={1.5} />
      </motion.span>

      <ol className="flex flex-col gap-3">
        {lines.map((line, i) => (
          <motion.li
            key={line}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.9 }}
            className="text-xl font-semibold"
          >
            {line}
          </motion.li>
        ))}
      </ol>

      <motion.button
        type="button"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 + lines.length * 0.9 }}
        onClick={() => onFinish({})}
        className="tap-target w-full max-w-xs rounded-xl bg-pause-foreground px-8 text-lg font-semibold text-pause"
      >
        {t("back")}
      </motion.button>
    </div>
  );
}
