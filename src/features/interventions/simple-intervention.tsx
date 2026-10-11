"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { OptionIcon, useOptionLabel } from "@/features/urge-flow/option-visuals";
import type { FlowOption } from "@/features/urge-flow/types";

const KNOWN = ["move", "reach_out", "music", "relax_muscles", "just_wait"];

// Henüz kendi mini deneyimi olmayan alternatifler: ikon, kısa yönerge, "Bitti".
export function SimpleIntervention({ option, onFinish }: { option: FlowOption; onFinish: () => void }) {
  const t = useTranslations("interventions.simple");
  const label = useOptionLabel();
  const reduceMotion = useReducedMotion();
  const instruction = option.key && KNOWN.includes(option.key) ? t(option.key) : t("custom");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <motion.span
        className="grid size-24 place-items-center rounded-full bg-pause-foreground/10"
        animate={reduceMotion ? undefined : { scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        <OptionIcon option={option} className="size-11" />
      </motion.span>
      <div className="flex max-w-xs flex-col gap-3">
        <h2 className="text-question">{label(option)}</h2>
        <p className="text-lg opacity-80">{instruction}</p>
      </div>
      <button
        type="button"
        onClick={onFinish}
        className="tap-target w-full max-w-xs rounded-xl bg-pause-foreground px-8 text-lg font-semibold text-pause"
      >
        {t("finish")}
      </button>
    </div>
  );
}
