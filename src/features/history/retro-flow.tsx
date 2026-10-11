"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { BehaviorIcon } from "@/components/pause/behavior-icon";
import { ChoiceCard } from "@/components/pause/choice-card";
import { PrimaryButton } from "@/components/pause/primary-button";
import { FlowHeader } from "@/features/urge-flow/flow-header";
import { IntensityPicker } from "@/features/urge-flow/intensity-picker";
import { useOptionLabel } from "@/features/urge-flow/option-visuals";
import type { FlowBehavior, FlowOption } from "@/features/urge-flow/types";
import { saveLocalEvent } from "@/lib/offline/sync";
import { localParts } from "@/lib/time/local";
import { uuid } from "@/lib/uuid";

import { behaviorLabel } from "./labels";

type Step = "when" | "behavior" | "intensity" | "outcome";
type WhenKey = "just_now" | "hour" | "three_hours" | "yesterday" | "custom";

const WHEN_OFFSETS: Record<Exclude<WhenKey, "custom">, number> = {
  just_now: 10 * 60_000,
  hour: 60 * 60_000,
  three_hours: 3 * 60 * 60_000,
  yesterday: 24 * 60 * 60_000,
};

// datetime-local girişi için yerel "YYYY-MM-DDTHH:mm"
function toInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Sonradan kayıt: ne zaman → (hangi davranış) → ne kadar güçlüydü → ne oldu.
// Cihaza yazılır; internet yoksa sonra gönderilir.
export function RetroFlow({
  userId,
  timeZone,
  behaviors,
  options,
}: {
  userId: string;
  timeZone: string;
  behaviors: FlowBehavior[];
  options: FlowOption[];
}) {
  const t = useTranslations("retro");
  const tc = useTranslations("common");
  const tb = useTranslations("behaviors");
  const label = useOptionLabel();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState<Step>("when");
  const [when, setWhen] = useState<WhenKey | null>(null);
  const [custom, setCustom] = useState(() => toInputValue(new Date(Date.now() - 60 * 60_000)));
  const [behaviorId, setBehaviorId] = useState<string | null>(behaviors.length === 1 ? behaviors[0].id : null);
  const [urge, setUrge] = useState(6);
  const [saving, setSaving] = useState(false);

  const steps: Step[] = ["when", ...(behaviors.length > 1 ? (["behavior"] as const) : []), "intensity", "outcome"];
  const next = () => setStep(steps[steps.indexOf(step) + 1] ?? step);
  const back = () => (steps.indexOf(step) > 0 ? setStep(steps[steps.indexOf(step) - 1]) : router.back());

  function occurredAt(): Date {
    if (when === "custom") {
      const d = new Date(custom);
      return Number.isNaN(d.getTime()) || d.getTime() > Date.now() ? new Date() : d;
    }
    return new Date(Date.now() - WHEN_OFFSETS[when ?? "just_now"]);
  }

  async function save(outcome: FlowOption) {
    if (!behaviorId || saving) return;
    setSaving(true);
    const at = occurredAt();
    const local = localParts(at, timeZone);
    const id = uuid();
    await saveLocalEvent({
      id,
      userId,
      emotions: [],
      triggers: [],
      interventions: [],
      answers: [],
      row: {
        id,
        behavior_id: behaviorId,
        occurred_at: at.toISOString(),
        local_date: local.date,
        local_hour: local.hour,
        local_weekday: local.weekday,
        urge_before: urge,
        pause_status: "none",
        source: "retro",
        emergency_mode: false,
        outcome_option_id: outcome.id,
        outcome_class: outcome.outcome_class,
      },
    });
    router.replace("/history");
    router.refresh();
  }

  const whenKeys: WhenKey[] = ["just_now", "hour", "three_hours", "yesterday", "custom"];
  const outcomes = options.filter((o) => o.kind === "outcome").sort((a, b) => a.sort_order - b.sort_order);

  const motionProps = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 } };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
      <FlowHeader onBack={back} onClose={() => router.push("/history")} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.main key={step} {...motionProps} transition={{ duration: 0.22 }} className="flex flex-1 flex-col gap-6 py-4">
          {step === "when" && (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="text-question">{t("whenTitle")}</h1>
                <p className="text-muted-foreground">{t("whenHint")}</p>
              </div>
              <div className="flex flex-col gap-2" role="radiogroup">
                {whenKeys.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={when === k}
                    onClick={() => {
                      setWhen(k);
                      if (k !== "custom") setTimeout(next, 200);
                    }}
                    className={
                      when === k
                        ? "tap-target rounded-xl border-2 border-primary bg-accent px-4 text-start font-semibold text-accent-foreground"
                        : "tap-target rounded-xl border-2 border-transparent bg-card px-4 text-start font-semibold"
                    }
                  >
                    {t(`when.${k}`)}
                  </button>
                ))}
              </div>
              {when === "custom" && (
                <input
                  type="datetime-local"
                  value={custom}
                  max={toInputValue(new Date())}
                  onChange={(e) => setCustom(e.target.value)}
                  className="tap-target rounded-xl border-2 border-primary bg-card px-4 text-lg outline-none"
                  aria-label={t("when.custom")}
                />
              )}
            </>
          )}

          {step === "behavior" && (
            <>
              <h1 className="text-question">{t("behaviorTitle")}</h1>
              <div className="grid grid-cols-2 gap-3" role="radiogroup">
                {behaviors.map((b) => (
                  <ChoiceCard
                    key={b.id}
                    multiple={false}
                    label={behaviorLabel(b, tb)}
                    icon={<BehaviorIcon name={b.icon} className="size-5" />}
                    selected={behaviorId === b.id}
                    onToggle={() => {
                      setBehaviorId(b.id);
                      setTimeout(next, 200);
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {step === "intensity" && (
            <IntensityPicker
              value={urge}
              onChange={setUrge}
              title={t("intensityTitle")}
              lowLabel={t("low")}
              highLabel={t("high")}
              ariaLabel={t("intensityTitle")}
            />
          )}

          {step === "outcome" && (
            <>
              <h1 className="text-question">{t("outcomeTitle")}</h1>
              <div className="flex flex-col gap-3" role="radiogroup">
                {outcomes.map((o) => (
                  <motion.button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={false}
                    disabled={saving}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => void save(o)}
                    className="tap-target rounded-card bg-card px-5 py-4 text-start text-lg font-semibold shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {label(o)}
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </motion.main>
      </AnimatePresence>

      {(step === "intensity" || (step === "when" && when === "custom")) && (
        <footer className="pt-2">
          <PrimaryButton onClick={next}>{tc("continue")}</PrimaryButton>
        </footer>
      )}
    </div>
  );
}
