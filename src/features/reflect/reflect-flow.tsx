"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";

import { ChoiceCard } from "@/components/pause/choice-card";
import { PrimaryButton } from "@/components/pause/primary-button";
import { StepShell } from "@/components/pause/step-shell";
import { OptionGrid } from "@/features/urge-flow/option-grid";
import { OptionIcon, useOptionLabel } from "@/features/urge-flow/option-visuals";
import { type FlowBehavior, type FlowOption, optionFitsBehavior } from "@/features/urge-flow/types";
import type { LocalEvent } from "@/lib/offline/db";
import { createClient } from "@/lib/supabase/client";
import { uuid } from "@/lib/uuid";

import { ChainTimeline, type ChainStep } from "./chain";

export type Reflection = {
  thought: string | null;
  first_action: string | null;
  duration_minutes: number | null;
  cut_point: ChainStep | null;
  next_option_id: string | null;
};

type Step = "intro" | "thought" | "action" | "duration" | "cut" | "next" | "done";
const STEPS: Step[] = ["intro", "thought", "action", "duration", "cut", "next", "done"];

// "Ne kadar sürdü?" seçenekleri (dakika olarak saklanır)
export const DURATIONS = [3, 10, 20, 45, 90] as const;

type Props = {
  userId: string;
  event: LocalEvent;
  behavior: FlowBehavior | undefined;
  options: FlowOption[];
  existing: Reflection | null;
  backHref: string;
};

export function ReflectFlow({ userId, event, behavior, options: initialOptions, existing, backHref }: Props) {
  const t = useTranslations("reflect");
  const tc = useTranslations("common");
  const tu = useTranslations("urge");
  const label = useOptionLabel();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [options, setOptions] = useState(initialOptions);
  const [thought, setThought] = useState(existing?.thought ?? "");
  const [action, setAction] = useState(existing?.first_action ?? "");
  const [duration, setDuration] = useState<number | null>(existing?.duration_minutes ?? null);
  const [cut, setCut] = useState<ChainStep | null>(existing?.cut_point ?? null);
  const [nextId, setNextId] = useState<string | null>(existing?.next_option_id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[index];
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const r = event.row;
  const outcome = r.outcome_option_id ? byId.get(r.outcome_option_id) : undefined;
  const names = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((o): o is FlowOption => !!o)
      .map(label)
      .join(", ");

  const durationLabel = duration != null ? t(`durations.${duration}`) : "";
  const chainValues: Partial<Record<ChainStep, string>> = {
    trigger: names(event.triggers),
    thought: thought.trim(),
    emotion: names(event.emotions),
    urge: r.urge_before != null ? `${r.urge_before} / 10` : "",
    first_action: action.trim(),
    control_shift:
      r.outcome_class === "stopped_early"
        ? [t("stoppedEarly"), durationLabel].filter(Boolean).join(" · ")
        : durationLabel,
    outcome: outcome ? label(outcome).replace(/\.$/, "") : "",
  };

  const interventions = options
    .filter((o) => o.kind === "intervention" && optionFitsBehavior(o, behavior))
    .sort((a, b) => a.sort_order - b.sort_order);
  const nextOption = nextId ? byId.get(nextId) : undefined;

  function go(delta: 1 | -1) {
    setDirection(delta);
    setError(null);
    setIndex((i) => Math.max(0, Math.min(STEPS.length - 1, i + delta)));
  }

  async function addCustomOption(text: string) {
    const id = uuid();
    const { error: err } = await createClient().from("options").insert({ id, kind: "intervention", label: text });
    if (err) return false;
    setOptions((prev) => [
      ...prev,
      {
        id,
        kind: "intervention",
        key: null,
        label: text,
        behavior_id: null,
        behavior_template_key: null,
        outcome_class: null,
        sort_order: 1000,
      },
    ]);
    setNextId(id);
    return true;
  }

  async function save() {
    setSaving(true);
    setError(null);
    const { error: err } = await createClient()
      .from("reflections")
      .upsert(
        {
          user_id: userId,
          event_id: event.id,
          thought: thought.trim() || null,
          first_action: action.trim() || null,
          duration_minutes: duration,
          cut_point: cut,
          next_option_id: nextId,
        },
        { onConflict: "user_id,event_id" },
      );
    setSaving(false);
    if (err) {
      setError(t("saveError"));
      return;
    }
    go(1);
  }

  function finish() {
    router.replace(backHref);
    router.refresh();
  }

  const skip = (
    <button
      type="button"
      onClick={() => go(1)}
      className="tap-target-sm px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      {tc("skip")}
    </button>
  );

  let body: ReactNode = null;
  let footer: ReactNode = null;
  let topRight: ReactNode = null;

  switch (step) {
    case "intro":
      body = (
        <div className="flex flex-col gap-6">
          <Title title={t("introTitle")} hint={t("introBody")} />
          <ChainTimeline values={chainValues} />
        </div>
      );
      footer = <PrimaryButton onClick={() => go(1)}>{t("start")}</PrimaryButton>;
      break;

    case "thought":
      topRight = skip;
      body = (
        <TextStep
          title={t("thoughtTitle")}
          hint={t("thoughtHint")}
          value={thought}
          onChange={setThought}
          placeholder={t("thoughtPlaceholder")}
        />
      );
      footer = <PrimaryButton onClick={() => go(1)}>{tc("continue")}</PrimaryButton>;
      break;

    case "action":
      topRight = skip;
      body = (
        <TextStep
          title={t("actionTitle")}
          hint={t("actionHint")}
          value={action}
          onChange={setAction}
          placeholder={t("actionPlaceholder")}
        />
      );
      footer = <PrimaryButton onClick={() => go(1)}>{tc("continue")}</PrimaryButton>;
      break;

    case "duration":
      topRight = skip;
      body = (
        <div className="flex flex-col gap-6">
          <Title title={t("durationTitle")} hint={t("durationHint")} />
          <div className="grid grid-cols-2 gap-3" role="radiogroup">
            {DURATIONS.map((m, i) => (
              <ChoiceCard
                key={m}
                label={t(`durations.${m}`)}
                selected={duration === m}
                multiple={false}
                onToggle={() => setDuration(duration === m ? null : m)}
                className={i === DURATIONS.length - 1 ? "col-span-2 min-h-16" : "min-h-16"}
              />
            ))}
          </div>
        </div>
      );
      footer = <PrimaryButton onClick={() => go(1)}>{tc("continue")}</PrimaryButton>;
      break;

    case "cut":
      body = (
        <div className="flex flex-col gap-6">
          <Title title={t("cutTitle")} hint={t("cutHint")} />
          <ChainTimeline values={chainValues} selected={cut} onSelect={setCut} />
        </div>
      );
      footer = (
        <PrimaryButton onClick={() => go(1)} disabled={!cut}>
          {tc("continue")}
        </PrimaryButton>
      );
      break;

    case "next":
      body = (
        <div className="flex flex-col gap-6">
          <Title title={t("nextTitle")} hint={cut ? t("nextHint", { step: t(`steps.${cut}`) }) : undefined} />
          <OptionGrid
            options={interventions}
            selected={nextId ? [nextId] : []}
            multiple={false}
            onToggle={(id) => setNextId(nextId === id ? null : id)}
            onAdd={addCustomOption}
          />
        </div>
      );
      footer = (
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-center text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <PrimaryButton onClick={() => void save()} loading={saving} disabled={!nextId}>
            {saving ? t("saving") : t("savePlan")}
          </PrimaryButton>
        </div>
      );
      break;

    case "done":
      body = (
        <div className="flex flex-1 flex-col justify-center gap-8">
          <div className="flex flex-col gap-3 text-center">
            <h1 className="text-question">{t("doneTitle")}</h1>
            <p className="text-muted-foreground">{t("doneBody")}</p>
          </div>
          {cut && nextOption && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-[0_1px_2px_oklch(0_0_0/0.04)]"
            >
              <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{t("nextTime")}</span>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold">{t(`steps.${cut}`)}</span>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                <span className="flex min-w-0 items-center gap-2 font-semibold">
                  <OptionIcon option={nextOption} className="size-5 shrink-0 text-primary" />
                  <span className="truncate">{label(nextOption)}</span>
                </span>
              </div>
            </motion.div>
          )}
        </div>
      );
      footer = <PrimaryButton onClick={finish}>{tu("done")}</PrimaryButton>;
      break;
  }

  const motionProps = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 32 * direction },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -32 * direction },
      };

  return (
    <StepShell
      step={index}
      total={STEPS.length}
      onBack={step === "done" ? undefined : index > 0 ? () => go(-1) : () => router.push(backHref)}
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

function Title({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-question">{title}</h1>
      {hint && <p className="text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TextStep({
  title,
  hint,
  value,
  onChange,
  placeholder,
}: {
  title: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Title title={title} hint={hint} />
      <textarea
        autoFocus
        value={value}
        maxLength={280}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border-2 border-transparent bg-card p-4 text-lg outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
      />
    </div>
  );
}
