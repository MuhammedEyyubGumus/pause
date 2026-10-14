"use client";

import { LifeBuoy, MoonStar, Plus, Shuffle, Sun, Sunrise, Sunset } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";

import { BehaviorIcon } from "@/components/pause/behavior-icon";
import { BrandMark } from "@/components/pause/brand";
import { ChoiceCard } from "@/components/pause/choice-card";
import { PrimaryButton } from "@/components/pause/primary-button";
import { StepShell } from "@/components/pause/step-shell";
import {
  BEHAVIOR_TEMPLATES,
  SAFETY_TEMPLATES,
  type TemplateKey,
  USUAL_TIMES,
  type UsualTime,
} from "@/features/behaviors/templates";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

import { completeOnboarding } from "./actions";

type StepId = "welcome" | "behaviors" | "timing" | "how" | "safety" | "goal";

const TIME_ICONS: Record<UsualTime, ReactNode> = {
  morning: <Sunrise className="size-5" />,
  afternoon: <Sun className="size-5" />,
  evening: <Sunset className="size-5" />,
  night: <MoonStar className="size-5" />,
  varies: <Shuffle className="size-5" />,
};

export function OnboardingFlow() {
  const t = useTranslations("onboarding");
  const tb = useTranslations("behaviors");
  const tc = useTranslations("common");
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [templates, setTemplates] = useState<TemplateKey[]>([]);
  const [customOn, setCustomOn] = useState(false);
  const [customName, setCustomName] = useState("");
  const [usualTimes, setUsualTimes] = useState<UsualTime[]>([]);

  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const needsSafety = templates.some((k) => SAFETY_TEMPLATES.includes(k));
  const steps = useMemo<StepId[]>(
    () => ["welcome", "behaviors", "timing", "how", ...(needsSafety ? (["safety"] as const) : []), "goal"],
    [needsSafety],
  );
  const step = steps[Math.min(index, steps.length - 1)];
  const behaviorCount = templates.length + (customOn ? 1 : 0);

  // Anonim ürün ölçümü: onboarding'in hangi ekranında çıkılıyor
  useEffect(() => {
    track("onboarding_step", { step });
  }, [step]);

  function go(delta: 1 | -1) {
    setDirection(delta);
    setError(null);
    setIndex((i) => Math.max(0, Math.min(steps.length - 1, i + delta)));
  }

  function toggleTemplate(key: TemplateKey) {
    setTemplates((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function toggleTime(time: UsualTime) {
    setUsualTimes((prev) => {
      if (prev.includes(time)) return prev.filter((x) => x !== time);
      // "Belli değil" diğerleriyle birlikte seçilmez
      if (time === "varies") return ["varies"];
      return [...prev.filter((x) => x !== "varies"), time];
    });
  }

  function finish() {
    setError(null);
    track("onboarding_completed", { behaviors: behaviorCount });
    startSaving(async () => {
      const result = await completeOnboarding({
        templates,
        customName: customOn ? customName.trim() || undefined : undefined,
        usualTimes,
        safetyAcknowledged: needsSafety,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      // Başarılıysa sunucu ana sayfaya yönlendirir; buraya yalnızca hata dönerse gelinir.
      if (result && !result.ok) setError(tc("error"));
    });
  }

  const canContinueBehaviors = templates.length > 0 || (customOn && customName.trim().length > 0);

  const footer: Record<StepId, ReactNode> = {
    welcome: <PrimaryButton onClick={() => go(1)}>{tc("continue")}</PrimaryButton>,
    behaviors: (
      <PrimaryButton onClick={() => go(1)} disabled={!canContinueBehaviors}>
        {tc("continue")}
      </PrimaryButton>
    ),
    timing: <PrimaryButton onClick={() => go(1)}>{tc("continue")}</PrimaryButton>,
    how: <PrimaryButton onClick={() => go(1)}>{tc("continue")}</PrimaryButton>,
    safety: <PrimaryButton onClick={() => go(1)}>{t("safetyAck")}</PrimaryButton>,
    goal: (
      <PrimaryButton onClick={finish} loading={saving}>
        {saving ? t("saving") : t("start")}
      </PrimaryButton>
    ),
  };

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
      total={steps.length}
      onBack={index > 0 && !saving ? () => go(-1) : undefined}
      topRight={
        step === "timing" ? (
          <button
            type="button"
            onClick={() => {
              setUsualTimes([]);
              go(1);
            }}
            className="tap-target-sm px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {tc("skip")}
          </button>
        ) : null
      }
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-center text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          {footer[step]}
        </div>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={step}
          {...motionProps}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col"
        >
          {step === "welcome" && <Welcome title={t("welcomeTitle")} body={t("welcomeBody")} />}

          {step === "behaviors" && (
            <div className="flex flex-col gap-6">
              <StepTitle title={t("behaviorsTitle")} hint={t("behaviorsHint")} />
              <div className="grid grid-cols-2 gap-3">
                {BEHAVIOR_TEMPLATES.map((b) => (
                  <ChoiceCard
                    key={b.key}
                    label={tb(b.key)}
                    icon={<BehaviorIcon name={b.icon} className="size-5" />}
                    selected={templates.includes(b.key)}
                    onToggle={() => toggleTemplate(b.key)}
                  />
                ))}
                <ChoiceCard
                  label={tb("custom")}
                  icon={<Plus className="size-5" />}
                  selected={customOn}
                  onToggle={() => setCustomOn((v) => !v)}
                />
              </div>

              <AnimatePresence initial={false}>
                {customOn && (
                  <motion.label
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-2 overflow-hidden"
                  >
                    <span className="text-sm font-semibold">{t("customLabel")}</span>
                    <input
                      autoFocus
                      value={customName}
                      maxLength={40}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={t("customPlaceholder")}
                      className="tap-target rounded-xl border-2 border-transparent bg-card px-4 text-base outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
                    />
                  </motion.label>
                )}
              </AnimatePresence>
            </div>
          )}

          {step === "timing" && (
            <div className="flex flex-col gap-6">
              <StepTitle title={t("timingTitle", { count: behaviorCount })} hint={t("timingHint")} />
              <div className="grid grid-cols-2 gap-3">
                {USUAL_TIMES.map((time) => (
                  <ChoiceCard
                    key={time}
                    label={t(`times.${time}`)}
                    icon={TIME_ICONS[time]}
                    selected={usualTimes.includes(time)}
                    onToggle={() => toggleTime(time)}
                    className={time === "varies" ? "col-span-2" : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {step === "how" && <HowItWorks />}

          {step === "safety" && (
            <div className="flex flex-col gap-6">
              <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground">
                <LifeBuoy className="size-7" strokeWidth={1.75} />
              </span>
              <h1 className="text-question">{t("safetyTitle")}</h1>
              <div className="flex flex-col gap-4 text-base leading-relaxed">
                <p>{t("safetyIntro")}</p>
                {templates.includes("alcohol") && <p>{t("safetyAlcohol")}</p>}
                {templates.includes("eating") && <p>{t("safetyEating")}</p>}
                <p className="rounded-xl bg-muted p-4 text-sm font-medium">{t("safetySupport")}</p>
              </div>
            </div>
          )}

          {step === "goal" && (
            <div className="flex flex-1 flex-col justify-center gap-5">
              <h1 className="text-question text-muted-foreground">{t("goalTitle")}</h1>
              <p className="text-4xl leading-tight font-bold tracking-tight">{t("goalBody")}</p>
            </div>
          )}
        </motion.section>
      </AnimatePresence>
    </StepShell>
  );
}

function StepTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-question">{title}</h1>
      {hint && <p className="text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Uygulama ikonuyla aynı iki çubuk: dürtü ile davranış arasındaki "alan".
// Çubuklar yavaşça birbirinden uzaklaşır.
function Welcome({ title, body }: { title: string; body: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex flex-1 flex-col justify-center gap-10">
      <div className="flex h-28 items-center justify-center gap-0" aria-hidden>
        {[-1, 1].map((side) => (
          <motion.span
            key={side}
            className="h-24 w-7 rounded-full bg-primary"
            initial={reduceMotion ? false : { x: 0 }}
            animate={{ x: side * 18 }}
            transition={{ duration: 1.6, ease: [0.45, 0, 0.55, 1], delay: 0.3 }}
          />
        ))}
      </div>
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark size="md" />
        <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-balance">{title}</h1>
        <p className="text-lg text-muted-foreground text-balance">{body}</p>
      </div>
    </div>
  );
}

function HowItWorks() {
  const t = useTranslations("onboarding");
  const reduceMotion = useReducedMotion();
  const items = [
    { title: t("how.urge"), sub: t("how.urgeSub") },
    { title: t("how.space"), sub: t("how.spaceSub"), accent: true },
    { title: t("how.alternative"), sub: t("how.alternativeSub") },
    { title: t("how.learning"), sub: t("how.learningSub") },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-question">{t("howTitle")}</h1>
      <ol className="relative flex flex-col gap-6">
        {/* Dikey bağlantı çizgisi */}
        <span className="absolute start-5 top-5 bottom-5 w-0.5 -translate-x-1/2 bg-border rtl:translate-x-1/2" aria-hidden />
        {items.map((item, i) => (
          <motion.li
            key={item.title}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.35, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-start gap-4"
          >
            <span
              className={cn(
                "relative z-10 grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold",
                item.accent ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-2 ring-border",
              )}
            >
              {i + 1}
            </span>
            <div className="flex flex-col gap-0.5 pt-1.5">
              <span className="text-lg font-semibold">{item.title}</span>
              <span className="text-muted-foreground">{item.sub}</span>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
