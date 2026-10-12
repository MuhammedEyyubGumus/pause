"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";

import { BehaviorIcon } from "@/components/pause/behavior-icon";
import { ChoiceCard } from "@/components/pause/choice-card";
import { PrimaryButton } from "@/components/pause/primary-button";
import { StepShell } from "@/components/pause/step-shell";
import { isTemplateKey } from "@/features/behaviors/templates";
import { OptionGrid } from "@/features/urge-flow/option-grid";
import { useOptionLabel } from "@/features/urge-flow/option-visuals";
import { type FlowBehavior, type FlowOption, optionFitsBehavior } from "@/features/urge-flow/types";
import { createClient } from "@/lib/supabase/client";

import { THRESHOLDS } from "./shared";

type Step = "behavior" | "trigger" | "intervention" | "threshold" | "confirm";

type Props = {
  behaviors: FlowBehavior[];
  options: FlowOption[];
  today: string;
  hasActive: boolean;
  initial: { behaviorId: string | null; triggerId: string | null; interventionId: string | null };
};

// Deney kurma: her ekranda tek karar. Haftalık hikâyeden gelince
// tetikleyici ve alternatif hazır gelir; yalnızca eşik ve onay kalır.
export function NewExperiment({ behaviors, options, today, hasActive, initial }: Props) {
  const t = useTranslations("experiment");
  const tb = useTranslations("behaviors");
  const tc = useTranslations("common");
  const label = useOptionLabel();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [behaviorId, setBehaviorId] = useState<string | null>(
    initial.behaviorId ?? (behaviors.length === 1 ? behaviors[0].id : null),
  );
  const [triggerId, setTriggerId] = useState<string | null>(initial.triggerId);
  const [interventionId, setInterventionId] = useState<string | null>(initial.interventionId);
  const [minUrge, setMinUrge] = useState<number>(initial.triggerId ? 7 : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  // Hikâyeden hazır gelen seçimler için adım gösterilmez
  const steps = useMemo<Step[]>(
    () => [
      ...(behaviors.length > 1 && !initial.behaviorId && !initial.interventionId ? (["behavior"] as const) : []),
      ...(!initial.interventionId ? (["trigger", "intervention"] as const) : []),
      "threshold",
      "confirm",
    ],
    [behaviors.length, initial.behaviorId, initial.interventionId],
  );
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const step = steps[index];

  const behavior = behaviors.find((b) => b.id === behaviorId);
  const byId = new Map(options.map((o) => [o.id, o]));
  const fits = (kind: FlowOption["kind"]) =>
    options
      .filter((o) => o.kind === kind && (behavior ? optionFitsBehavior(o, behavior) : !o.behavior_id))
      .sort((a, b) => a.sort_order - b.sort_order);

  function go(delta: 1 | -1) {
    setDirection(delta);
    setIndex((i) => Math.max(0, Math.min(steps.length - 1, i + delta)));
  }

  async function start() {
    if (!interventionId) return;
    setBusy(true);
    setError(false);
    const { error: err } = await createClient().rpc("start_experiment", {
      p_intervention: interventionId,
      ...(triggerId ? { p_trigger: triggerId } : {}),
      ...(behaviorId ? { p_behavior: behaviorId } : {}),
      p_min_urge: minUrge,
      p_today: today,
    });
    if (err) {
      setBusy(false);
      setError(true);
      return;
    }
    router.replace("/experiment");
    router.refresh();
  }

  const trigger = triggerId ? byId.get(triggerId) : undefined;
  const intervention = interventionId ? byId.get(interventionId) : undefined;
  const ruleSteps = [
    `${trigger ? t("whenTrigger", { trigger: label(trigger) }) : t("whenAny")}${minUrge > 0 ? ` ≥ ${minUrge}` : ""}`,
    intervention ? label(intervention) : "—",
    "PAUSE",
  ];

  let body: ReactNode = null;
  let footer: ReactNode = null;
  let topRight: ReactNode = null;

  switch (step) {
    case "behavior":
      body = (
        <Section title={t("behaviorTitle")}>
          <div className="grid grid-cols-2 gap-3">
            <ChoiceCard
              label={t("allBehaviors")}
              selected={behaviorId === null}
              multiple={false}
              onToggle={() => setBehaviorId(null)}
              className="col-span-2 min-h-16"
            />
            {behaviors.map((b) => (
              <ChoiceCard
                key={b.id}
                label={isTemplateKey(b.template_key) ? tb(b.template_key) : b.name}
                icon={<BehaviorIcon name={b.icon} className="size-5" />}
                selected={behaviorId === b.id}
                multiple={false}
                onToggle={() => setBehaviorId(b.id)}
              />
            ))}
          </div>
        </Section>
      );
      footer = <PrimaryButton onClick={() => go(1)}>{tc("continue")}</PrimaryButton>;
      break;

    case "trigger":
      topRight = (
        <button
          type="button"
          onClick={() => {
            setTriggerId(null);
            go(1);
          }}
          className="tap-target-sm px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {t("anyTrigger")}
        </button>
      );
      body = (
        <Section title={t("triggerTitle")} hint={t("triggerHint")}>
          <OptionGrid
            options={fits("trigger")}
            selected={triggerId ? [triggerId] : []}
            multiple={false}
            onToggle={(id) => setTriggerId(triggerId === id ? null : id)}
          />
        </Section>
      );
      footer = <PrimaryButton onClick={() => go(1)}>{tc("continue")}</PrimaryButton>;
      break;

    case "intervention":
      body = (
        <Section title={t("interventionTitle")} hint={t("interventionHint")}>
          <OptionGrid
            options={fits("intervention")}
            selected={interventionId ? [interventionId] : []}
            multiple={false}
            onToggle={(id) => setInterventionId(id)}
          />
        </Section>
      );
      footer = (
        <PrimaryButton onClick={() => go(1)} disabled={!interventionId}>
          {tc("continue")}
        </PrimaryButton>
      );
      break;

    case "threshold":
      body = (
        <Section title={t("thresholdTitle")} hint={t("thresholdHint")}>
          <div className="flex flex-col gap-3" role="radiogroup">
            {THRESHOLDS.map((v) => (
              <ChoiceCard
                key={v}
                label={v === 0 ? t("thresholdAny") : t("thresholdMin", { value: v })}
                selected={minUrge === v}
                multiple={false}
                onToggle={() => setMinUrge(v)}
                className="min-h-16"
              />
            ))}
          </div>
        </Section>
      );
      footer = <PrimaryButton onClick={() => go(1)}>{tc("continue")}</PrimaryButton>;
      break;

    case "confirm":
      body = (
        <Section title={t("confirmTitle")} hint={t("confirmHint")}>
          {behavior && <p className="text-sm font-semibold">{isTemplateKey(behavior.template_key) ? tb(behavior.template_key) : behavior.name}</p>}
          <ol className="flex flex-col gap-2">
            {ruleSteps.map((s, i) => (
              <li key={`${i}-${s}`} className="flex flex-col items-start gap-1">
                <span
                  className={
                    i === ruleSteps.length - 1
                      ? "rounded-xl bg-primary px-4 py-3 text-lg font-semibold text-primary-foreground"
                      : "rounded-xl bg-card px-4 py-3 text-lg font-semibold"
                  }
                >
                  {s}
                </span>
                {i < ruleSteps.length - 1 && <span className="ps-4 text-lg text-muted-foreground" aria-hidden>↓</span>}
              </li>
            ))}
          </ol>
          {hasActive && <p className="rounded-xl bg-muted p-3 text-sm">{t("replaceWarning")}</p>}
        </Section>
      );
      footer = (
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-center text-sm font-medium text-destructive">
              {t("saveError")}
            </p>
          )}
          <PrimaryButton onClick={() => void start()} loading={busy} disabled={!interventionId}>
            {t("start")}
          </PrimaryButton>
        </div>
      );
      break;
  }

  const motionProps = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 32 * direction }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -32 * direction } };

  return (
    <StepShell
      step={index}
      total={steps.length}
      onBack={index > 0 ? () => go(-1) : () => router.back()}
      topRight={topRight}
      footer={footer}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={step}
          {...motionProps}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col"
        >
          {body}
        </motion.section>
      </AnimatePresence>
    </StepShell>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-question">{title}</h1>
        {hint && <p className="text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
