"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BehaviorIcon } from "@/components/pause/behavior-icon";
import { ChoiceCard } from "@/components/pause/choice-card";
import { PrimaryButton } from "@/components/pause/primary-button";
import { TimerRing } from "@/components/pause/timer-ring";
import { isTemplateKey } from "@/features/behaviors/templates";
import { Breathe } from "@/features/interventions/breathe";
import { InterventionPlayer } from "@/features/interventions/intervention-player";
import type { LocalEvent, LocalIntervention } from "@/lib/offline/db";
import { localDb } from "@/lib/offline/db";
import { findActiveLocalEvent, saveLocalEvent } from "@/lib/offline/sync";
import { SyncAgent } from "@/lib/offline/sync-agent";
import { createClient } from "@/lib/supabase/client";
import { localParts } from "@/lib/time/local";
import { uuid } from "@/lib/uuid";
import { cn } from "@/lib/utils";

import { ChangeView } from "./change-view";
import { FlowHeader } from "./flow-header";
import { IntensityPicker } from "./intensity-picker";
import { OptionGrid } from "./option-grid";
import { questionsFor } from "./questions";
import { type FlowBehavior, type FlowOption, type OptionKind, optionFitsBehavior } from "./types";
import { formatClock, usePauseClock } from "./use-pause-clock";

type Mode = "live" | "sos" | "resume";

type Step =
  | "loading"
  | "behavior"
  | "intensity"
  | "pause"
  | "emotions"
  | "triggers"
  | "question"
  | "pick"
  | "intervention"
  | "waiting"
  | "sos"
  | "sosBefore"
  | "remeasure"
  | "change"
  | "sosBehavior"
  | "outcome"
  | "data";

// Pause sürerken süre dolarsa kendiliğinden "Şimdi nasıl?"a geçilen adımlar.
// Bir alternatifin içindeyken (intervention) kullanıcı bölünmez.
const INTERRUPTIBLE: Step[] = ["pause", "emotions", "triggers", "question", "pick", "waiting", "sos"];
// Koyu "pause yüzeyi" kullanan adımlar
const PAUSE_SURFACE: Step[] = ["pause", "intervention", "waiting", "sos"];

type Props = {
  mode: Mode;
  userId: string;
  timeZone: string;
  behaviors: FlowBehavior[];
  options: FlowOption[];
  serverEvent?: LocalEvent | null; // resume: sunucudaki kayıt (cihazda yoksa)
  eventId?: string;
};

export function UrgeFlow({ mode, userId, timeZone, behaviors, options: initialOptions, serverEvent, eventId }: Props) {
  const t = useTranslations("urge");
  const tc = useTranslations("common");
  const tb = useTranslations("behaviors");
  const tOpt = useTranslations("options");
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState<Step>("loading");
  const [event, setEvent] = useState<LocalEvent | null>(null);
  const [behaviorId, setBehaviorId] = useState<string | null>(behaviors.length === 1 ? behaviors[0].id : null);
  const [urge, setUrge] = useState(5);
  const [after, setAfter] = useState(5);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [options, setOptions] = useState(initialOptions);
  const [activeIntervention, setActiveIntervention] = useState<LocalIntervention | null>(null);
  const [asked, setAsked] = useState(false); // duygu/tetikleyici soruldu mu
  const [error, setError] = useState<string | null>(null);
  const flowStartedAt = useRef(Date.now());
  const initialized = useRef(false);
  const vibrated = useRef(false);

  const behavior = behaviors.find((b) => b.id === (event?.row.behavior_id ?? behaviorId));
  const questions = questionsFor(behavior?.template_key);
  const clock = usePauseClock(event?.row.pause_started_at, event?.row.pause_ends_at);
  const pauseRunning = !!event && event.row.pause_status === "active" && !event.row.remeasured_at;

  const byKind = useCallback(
    (kind: OptionKind) =>
      options
        .filter((o) => o.kind === kind && optionFitsBehavior(o, behavior))
        .sort((a, b) => a.sort_order - b.sort_order),
    [options, behavior],
  );

  // ------------------------------------------------------------------
  // Kayıt yardımcıları: önce cihaza, sonra arka planda sunucuya
  // ------------------------------------------------------------------
  const persist = useCallback(async (next: LocalEvent) => {
    setEvent(next);
    try {
      await saveLocalEvent(next);
    } catch {
      setError(t("saveError"));
    }
  }, [t]);

  const patchRow = useCallback(
    (patch: Partial<LocalEvent["row"]>, extra?: Partial<LocalEvent>) => {
      if (!event) return;
      void persist({ ...event, ...extra, row: { ...event.row, ...patch } });
    },
    [event, persist],
  );

  function newEvent(b: FlowBehavior, opts: { urgeBefore: number | null; sos: boolean }): LocalEvent {
    const now = new Date();
    const local = localParts(now, timeZone);
    const minutes = b.pause_minutes || 10;
    const id = uuid();
    return {
      id,
      userId,
      emotions: [],
      triggers: [],
      interventions: [],
      answers: [],
      synced: 0,
      updatedAt: Date.now(),
      row: {
        id,
        behavior_id: b.id,
        occurred_at: now.toISOString(),
        local_date: local.date,
        local_hour: local.hour,
        local_weekday: local.weekday,
        urge_before: opts.urgeBefore,
        pause_minutes: minutes,
        pause_started_at: now.toISOString(),
        pause_ends_at: new Date(now.getTime() + minutes * 60_000).toISOString(),
        pause_status: "active",
        emergency_mode: opts.sos,
        source: opts.sos ? "sos" : "live",
        entry_ms: Date.now() - flowStartedAt.current,
      },
    };
  }

  // ------------------------------------------------------------------
  // Başlangıç: devam eden bir pause varsa ona dön, yoksa yeni akış
  // ------------------------------------------------------------------
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    void (async () => {
      if (mode === "resume" && eventId) {
        const local = (await localDb.events.get(eventId)) ?? serverEvent ?? null;
        if (!local || local.userId !== userId) {
          router.replace("/");
          return;
        }
        if (!(await localDb.events.get(eventId))) await localDb.events.put({ ...local, synced: 1 });
        setEvent(local);
        setUrge(local.row.urge_before ?? 5);
        setAfter(local.row.urge_after ?? local.row.urge_before ?? 5);
        setAsked(local.emotions.length > 0 || local.triggers.length > 0);
        setStep(resumeStep(local));
        return;
      }

      // Aynı anda iki pause olmasın: cihazda devam eden varsa ona git
      const active = await findActiveLocalEvent(userId);
      if (active) {
        router.replace(`/pause/${active.id}`);
        return;
      }

      if (mode === "sos") {
        const b = behaviors[0];
        if (!b) {
          router.replace("/");
          return;
        }
        const ev = newEvent(b, { urgeBefore: null, sos: true });
        await persist(ev);
        window.history.replaceState(null, "", `/pause/${ev.id}`);
        setStep("sos");
        return;
      }

      setStep(behaviors.length > 1 ? "behavior" : "intensity");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resumeStep(ev: LocalEvent): Step {
    const r = ev.row;
    if (r.pause_status !== "active") return "loading"; // aşağıdaki effect ana sayfaya yollar
    if (r.remeasured_at) return "outcome";
    const ended = r.pause_ends_at ? Date.parse(r.pause_ends_at) <= Date.now() : true;
    if (r.emergency_mode) {
      if (!ended) return "sos";
      return r.urge_before == null ? "sosBefore" : "remeasure";
    }
    return ended ? "remeasure" : "waiting";
  }

  // Bitmiş bir olaya dönülürse ana sayfaya
  useEffect(() => {
    if (step === "loading" && event && event.row.pause_status !== "active") router.replace("/");
  }, [step, event, router]);

  // Süre dolunca: titreşim + "Şimdi nasıl?"
  useEffect(() => {
    if (!pauseRunning || !clock.done || !INTERRUPTIBLE.includes(step)) return;
    if (!vibrated.current) {
      navigator.vibrate?.([120, 80, 120]);
      vibrated.current = true;
    }
    if (event?.row.emergency_mode && event.row.urge_before == null) setStep("sosBefore");
    else setStep("remeasure");
  }, [clock.done, step, pauseRunning, event]);

  // Sekme başlığında kalan süre
  useEffect(() => {
    if (!pauseRunning) return;
    document.title = clock.done ? "PAUSE" : `${formatClock(clock.remainingMs)} · PAUSE`;
    return () => {
      document.title = "PAUSE";
    };
  }, [clock.remainingMs, clock.done, pauseRunning]);

  // ------------------------------------------------------------------
  // Adım geçişleri
  // ------------------------------------------------------------------
  function startPause() {
    if (!behavior) return;
    const ev = newEvent(behavior, { urgeBefore: urge, sos: false });
    setAfter(urge); // yeniden ölçüm kaydırıcısı başlangıç değerinden başlasın
    void persist(ev);
    // Yenilemede aynı pause'a dönülsün
    window.history.replaceState(null, "", `/pause/${ev.id}`);
    setStep("pause");
  }

  // "Bir şey dene": duygu/tetikleyici henüz sorulmadıysa önce onlar
  function goTry() {
    if (!asked) {
      setAsked(true);
      setStep("emotions");
    } else {
      setStep("pick");
    }
  }

  function afterTriggers() {
    setStep(questions.length ? "question" : "pick");
  }

  function toggleIn(list: "emotions" | "triggers", id: string) {
    if (!event) return;
    const current = event[list];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    void persist({ ...event, [list]: next });
  }

  async function addCustomOption(kind: OptionKind, label: string): Promise<boolean> {
    const supabase = createClient();
    const id = uuid();
    const { error: err } = await supabase.from("options").insert({ id, kind, label });
    if (err) return false;
    const option: FlowOption = {
      id,
      kind,
      key: null,
      label,
      behavior_id: null,
      behavior_template_key: null,
      outcome_class: null,
      sort_order: 1000,
    };
    setOptions((prev) => [...prev, option]);
    if (kind === "emotion") toggleIn("emotions", id);
    if (kind === "trigger") toggleIn("triggers", id);
    if (kind === "intervention") startIntervention(option);
    return true;
  }

  function saveAnswer(key: string, value: number) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function commitAnswers() {
    if (!event) return;
    const merged = questions.map((q) => ({ question_key: q.key, value_num: answers[q.key] ?? 5 }));
    void persist({ ...event, answers: merged });
    setStep("pick");
  }

  function startIntervention(option: FlowOption) {
    if (!event) return;
    const iv: LocalIntervention = {
      id: uuid(),
      option_id: option.id,
      position: event.interventions.length,
      started_at: new Date().toISOString(),
      ended_at: null,
      completed: false,
      details: {},
    };
    setActiveIntervention(iv);
    void persist({ ...event, interventions: [...event.interventions, iv] });
    setStep("intervention");
  }

  function finishIntervention(details: Record<string, unknown>, completed = true) {
    if (!event || !activeIntervention) return;
    const ended = { ...activeIntervention, ended_at: new Date().toISOString(), completed, details };
    void persist({
      ...event,
      interventions: event.interventions.map((i) => (i.id === ended.id ? ended : i)),
    });
    setActiveIntervention(null);
    setStep(clock.done ? "remeasure" : "waiting");
  }

  function saveRemeasure() {
    if (!event) return;
    const now = new Date().toISOString();
    patchRow({ urge_after: after, remeasured_at: now, pause_completed_at: now });
    setStep("change");
  }

  function afterChange() {
    setStep(event?.row.emergency_mode && behaviors.length > 1 ? "sosBehavior" : "outcome");
  }

  function chooseOutcome(option: FlowOption) {
    if (!event) return;
    patchRow({
      outcome_option_id: option.id,
      outcome_class: option.outcome_class,
      pause_status: "completed",
    });
    if (option.outcome_class === "occurred" || option.outcome_class === "stopped_early") {
      setStep("data");
    } else {
      finish();
    }
  }

  function finish() {
    document.title = "PAUSE";
    router.replace("/");
    router.refresh();
  }

  function close() {
    router.push("/");
  }

  // ------------------------------------------------------------------
  // Ekranlar
  // ------------------------------------------------------------------
  const activeOption = activeIntervention ? options.find((o) => o.id === activeIntervention.option_id) : undefined;
  const onPauseSurface = PAUSE_SURFACE.includes(step);
  const remainingForHeader = pauseRunning && !onPauseSurface ? clock.remainingMs : null;

  let header: ReactNode = null;
  let body: ReactNode = null;
  let footer: ReactNode = null;

  switch (step) {
    case "loading":
      body = <div className="flex-1" />;
      break;

    case "behavior":
      header = <FlowHeader onClose={close} />;
      body = (
        <div className="flex flex-col gap-6">
          <h1 className="text-question">{t("behaviorTitle")}</h1>
          <div className="grid grid-cols-2 gap-3" role="radiogroup">
            {behaviors.map((b) => (
              <ChoiceCard
                key={b.id}
                multiple={false}
                label={isTemplateKey(b.template_key) ? tb(b.template_key) : b.name}
                icon={<BehaviorIcon name={b.icon} className="size-5" />}
                selected={behaviorId === b.id}
                onToggle={() => {
                  setBehaviorId(b.id);
                  setTimeout(() => setStep("intensity"), 250);
                }}
              />
            ))}
          </div>
        </div>
      );
      break;

    case "intensity":
      header = <FlowHeader onBack={behaviors.length > 1 ? () => setStep("behavior") : undefined} onClose={close} />;
      body = (
        <IntensityPicker
          value={urge}
          onChange={setUrge}
          title={t("intensityTitle")}
          lowLabel={t("intensityLow")}
          highLabel={t("intensityHigh")}
          ariaLabel={t("intensityTitle")}
        />
      );
      footer = <PrimaryButton onClick={startPause}>{tc("continue")}</PrimaryButton>;
      break;

    case "pause":
      header = <FlowHeader onClose={close} tone="pause" />;
      body = (
        <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
          <TimerRing progress={clock.progress} label={formatClock(clock.remainingMs)} size={260} />
          <div className="flex max-w-xs flex-col gap-2">
            <p className="text-2xl leading-snug font-semibold text-balance">{t("pauseTitle")}</p>
            <p className="opacity-75">{t("pauseSub", { minutes: event?.row.pause_minutes ?? 10 })}</p>
          </div>
        </div>
      );
      footer = (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={goTry}
            className="tap-target w-full rounded-xl bg-pause-foreground text-lg font-bold tracking-wide text-pause transition-transform active:scale-[0.98]"
          >
            {t("tryButton")}
          </button>
          <button type="button" onClick={() => setStep("waiting")} className="tap-target-sm w-full font-semibold opacity-70">
            {t("justWait")}
          </button>
        </div>
      );
      break;

    case "emotions":
      header = <FlowHeader onBack={() => setStep("pause")} remainingMs={remainingForHeader} />;
      body = (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-question">{t("emotionsTitle")}</h1>
            <p className="text-muted-foreground">{t("emotionsHint")}</p>
          </div>
          <OptionGrid
            options={byKind("emotion")}
            selected={event?.emotions ?? []}
            onToggle={(id) => toggleIn("emotions", id)}
            onAdd={(label) => addCustomOption("emotion", label)}
          />
        </div>
      );
      footer = (
        <PrimaryButton onClick={() => setStep("triggers")}>
          {event?.emotions.length ? tc("continue") : tc("skip")}
        </PrimaryButton>
      );
      break;

    case "triggers":
      header = <FlowHeader onBack={() => setStep("emotions")} remainingMs={remainingForHeader} />;
      body = (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-question">{t("triggersTitle")}</h1>
            <p className="text-muted-foreground">{t("multiHint")}</p>
          </div>
          <OptionGrid
            options={byKind("trigger")}
            selected={event?.triggers ?? []}
            onToggle={(id) => toggleIn("triggers", id)}
            onAdd={(label) => addCustomOption("trigger", label)}
          />
        </div>
      );
      footer = (
        <PrimaryButton onClick={afterTriggers}>{event?.triggers.length ? tc("continue") : tc("skip")}</PrimaryButton>
      );
      break;

    case "question": {
      const q = questions[0];
      header = <FlowHeader onBack={() => setStep("triggers")} remainingMs={remainingForHeader} />;
      body = q ? (
        <IntensityPicker
          value={answers[q.key] ?? 5}
          onChange={(v) => saveAnswer(q.key, v)}
          title={t(q.titleKey)}
          lowLabel={t(q.lowKey)}
          highLabel={t(q.highKey)}
          ariaLabel={t(q.titleKey)}
        />
      ) : null;
      footer = <PrimaryButton onClick={commitAnswers}>{tc("continue")}</PrimaryButton>;
      break;
    }

    case "pick":
      header = (
        <FlowHeader
          onBack={() => setStep(questions.length ? "question" : "triggers")}
          remainingMs={remainingForHeader}
        />
      );
      body = (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-question">{t("pickTitle")}</h1>
            <p className="text-muted-foreground">{t("pickHint")}</p>
          </div>
          <OptionGrid
            options={byKind("intervention")}
            selected={[]}
            multiple={false}
            onToggle={(id) => {
              const o = options.find((x) => x.id === id);
              if (o) startIntervention(o);
            }}
            onAdd={(label) => addCustomOption("intervention", label)}
          />
        </div>
      );
      footer = (
        <button type="button" onClick={() => setStep("waiting")} className="tap-target-sm w-full font-semibold text-muted-foreground">
          {t("justWait")}
        </button>
      );
      break;

    case "intervention":
      header = (
        <FlowHeader
          onBack={() => finishIntervention({}, false)}
          remainingMs={pauseRunning ? clock.remainingMs : null}
          tone="pause"
        />
      );
      body = activeOption ? <InterventionPlayer option={activeOption} onFinish={(d) => finishIntervention(d)} /> : null;
      break;

    case "waiting":
      header = <FlowHeader onClose={close} tone="pause" />;
      body = (
        <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
          <TimerRing progress={clock.progress} label={formatClock(clock.remainingMs)} size={240} />
          <div className="flex max-w-xs flex-col gap-2">
            <p className="text-2xl font-semibold">{t("waitingTitle")}</p>
            <p className="opacity-75">{t("waitingSub")}</p>
          </div>
        </div>
      );
      footer = (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={goTry}
            className="tap-target w-full rounded-xl bg-pause-foreground text-lg font-semibold text-pause transition-transform active:scale-[0.98]"
          >
            {t("tryAnother")}
          </button>
          <button type="button" onClick={() => setStep("remeasure")} className="tap-target-sm w-full font-semibold opacity-70">
            {t("measureNow")}
          </button>
        </div>
      );
      break;

    case "sos":
      header = <FlowHeader onClose={close} tone="pause" />;
      body = (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="text-question">{t("sosTitle")}</p>
          <p className="numeric text-timer">{formatClock(clock.remainingMs)}</p>
          <Breathe compact />
          <p className="opacity-75">{t("sosSub")}</p>
        </div>
      );
      footer = (
        <button
          type="button"
          onClick={() => setStep(event?.row.urge_before == null ? "sosBefore" : "remeasure")}
          className="tap-target-sm w-full font-semibold opacity-70"
        >
          {t("sosFinish")}
        </button>
      );
      break;

    case "sosBefore":
      header = <FlowHeader />;
      body = (
        <IntensityPicker
          value={urge}
          onChange={setUrge}
          title={t("sosBeforeTitle")}
          lowLabel={t("intensityLow")}
          highLabel={t("intensityHigh")}
          ariaLabel={t("sosBeforeTitle")}
        />
      );
      footer = (
        <PrimaryButton
          onClick={() => {
            patchRow({ urge_before: urge });
            setAfter(urge);
            setStep("remeasure");
          }}
        >
          {tc("continue")}
        </PrimaryButton>
      );
      break;

    case "remeasure":
      header = <FlowHeader />;
      body = (
        <div className="flex flex-1 flex-col gap-2">
          {clock.done && <p className="text-center text-sm font-semibold text-primary">{t("timeUp")}</p>}
          <IntensityPicker
            value={after}
            onChange={setAfter}
            title={t("remeasureTitle")}
            lowLabel={t("intensityLow")}
            highLabel={t("intensityHigh")}
            ariaLabel={t("remeasureTitle")}
          />
        </div>
      );
      footer = <PrimaryButton onClick={saveRemeasure}>{tc("continue")}</PrimaryButton>;
      break;

    case "change":
      header = <FlowHeader />;
      body = <ChangeView before={event?.row.urge_before ?? urge} after={event?.row.urge_after ?? after} />;
      footer = <PrimaryButton onClick={afterChange}>{tc("continue")}</PrimaryButton>;
      break;

    case "sosBehavior":
      header = <FlowHeader />;
      body = (
        <div className="flex flex-col gap-6">
          <h1 className="text-question">{t("sosBehaviorTitle")}</h1>
          <div className="grid grid-cols-2 gap-3" role="radiogroup">
            {behaviors.map((b) => (
              <ChoiceCard
                key={b.id}
                multiple={false}
                label={isTemplateKey(b.template_key) ? tb(b.template_key) : b.name}
                icon={<BehaviorIcon name={b.icon} className="size-5" />}
                selected={event?.row.behavior_id === b.id}
                onToggle={() => {
                  patchRow({ behavior_id: b.id });
                  setTimeout(() => setStep("outcome"), 250);
                }}
              />
            ))}
          </div>
        </div>
      );
      break;

    case "outcome":
      header = <FlowHeader />;
      body = (
        <div className="flex flex-col gap-6">
          <h1 className="text-question">{t("outcomeTitle")}</h1>
          <div className="flex flex-col gap-3" role="radiogroup">
            {byKind("outcome").map((o) => (
              <motion.button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={event?.row.outcome_option_id === o.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => chooseOutcome(o)}
                className="tap-target rounded-card bg-card px-5 py-4 text-start text-lg font-semibold shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-colors hover:bg-accent"
              >
                {o.key ? tOpt(`outcome.${o.key}`) : o.label}
              </motion.button>
            ))}
          </div>
        </div>
      );
      break;

    case "data":
      body = (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <motion.span
            initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="size-4 rounded-full bg-primary shadow-[0_0_0_10px_var(--accent)]"
            aria-hidden
          />
          <h1 className="text-[2rem] leading-tight font-bold">{t("dataTitle")}</h1>
          <p className="max-w-xs text-lg text-muted-foreground">{t("dataBody")}</p>
          <p className="max-w-xs text-sm text-muted-foreground">{t("dataLater")}</p>
        </div>
      );
      footer = <PrimaryButton onClick={finish}>{t("done")}</PrimaryButton>;
      break;
  }

  const motionProps = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } };

  return (
    <motion.div
      className={cn("min-h-dvh transition-colors duration-[600ms] ease-calm", onPauseSurface && "bg-pause text-pause-foreground")}
    >
      <SyncAgent />
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
        {header ?? <div className="h-14" />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={step}
            {...motionProps}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col py-4"
          >
            {body}
          </motion.main>
        </AnimatePresence>
        {error && (
          <p role="alert" className="pb-2 text-center text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        {footer && <footer className="pt-2">{footer}</footer>}
      </div>
    </motion.div>
  );
}
