"use client";

import { Scissors } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export const CHAIN_STEPS = ["trigger", "thought", "emotion", "urge", "first_action", "control_shift", "outcome"] as const;
export type ChainStep = (typeof CHAIN_STEPS)[number];
// Sonuç halkası kesilecek bir nokta değildir
export const CUTTABLE: ChainStep[] = CHAIN_STEPS.filter((s) => s !== "outcome");

type Props = {
  values: Partial<Record<ChainStep, string>>;
  // Seçim modu: halkaya dokununca "zinciri burada kesebilirdim"
  selected?: ChainStep | null;
  onSelect?: (step: ChainStep) => void;
};

// Brief bölüm 18: Tetikleyici → Düşünce → Duygu → Dürtü → İlk davranış → Kontrol değişimi → Sonuç
export function ChainTimeline({ values, selected, onSelect }: Props) {
  const t = useTranslations("reflect.steps");
  const tr = useTranslations("reflect");
  const reduceMotion = useReducedMotion();
  const selectable = !!onSelect;

  return (
    <ol className="relative flex flex-col" role={selectable ? "radiogroup" : undefined} aria-label={tr("chainLabel")}>
      {CHAIN_STEPS.map((step, i) => {
        const value = values[step];
        const isCut = selected === step;
        const canSelect = selectable && CUTTABLE.includes(step);
        const last = i === CHAIN_STEPS.length - 1;

        const content = (
          <>
            {/* Halka + bağlantı çizgisi */}
            <span className="relative flex w-10 shrink-0 justify-center self-stretch">
              {!last && (
                <span
                  className={cn(
                    "absolute top-10 bottom-0 w-0.5",
                    selected && CHAIN_STEPS.indexOf(selected) === i ? "border-s-2 border-dashed border-primary" : "bg-border",
                  )}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  "relative z-10 grid size-10 place-items-center rounded-full text-sm font-bold transition-colors",
                  isCut
                    ? "bg-primary text-primary-foreground"
                    : value
                      ? "bg-card text-foreground ring-2 ring-primary/40"
                      : "bg-card text-muted-foreground ring-2 ring-border",
                )}
              >
                {isCut ? <Scissors className="size-4" aria-hidden /> : i + 1}
              </span>
            </span>
            <span className={cn("flex min-w-0 flex-1 flex-col gap-0.5 pt-2", last ? "pb-1" : "pb-5")}>
              <span className="font-semibold">{t(step)}</span>
              <span className={cn("text-sm", value ? "text-foreground/80" : "text-muted-foreground/70")}>
                {value || tr("unknown")}
              </span>
              {isCut && <span className="pt-1 text-sm font-semibold text-primary">{tr("cutHere")}</span>}
            </span>
          </>
        );

        return (
          <motion.li
            key={step}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {canSelect ? (
              <button
                type="button"
                role="radio"
                aria-checked={isCut}
                onClick={() => onSelect!(step)}
                className={cn(
                  "flex w-full gap-3 rounded-xl px-1 text-start transition-colors",
                  isCut ? "bg-accent/60" : "hover:bg-accent/30",
                )}
              >
                {content}
              </button>
            ) : (
              <div className={cn("flex gap-3 px-1", selectable && "opacity-60")}>{content}</div>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
