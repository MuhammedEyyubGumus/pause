"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { PrimaryButton } from "@/components/pause/primary-button";

import { type AnalysisResult, runAnalysis, setAiConsent } from "./actions";

type Latest = { body: string; source: "ai" | "template"; createdAt: string; lines: string[] } | null;

type Props = {
  consent: boolean;
  latest: Latest;
  period: string;
  behaviorId: string | null;
  urges: number;
  minUrges: number;
};

export function AnalyzePanel({ consent: initialConsent, latest: initialLatest, period, behaviorId, urges, minUrges }: Props) {
  const t = useTranslations("analyze");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const [consent, setConsent] = useState(initialConsent);
  const [latest, setLatest] = useState<Latest>(initialLatest);
  const [error, setError] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState(0);

  // Filtre değişince sunucudan gelen son yorum gösterilir
  useEffect(() => setLatest(initialLatest), [initialLatest]);
  useEffect(() => setConsent(initialConsent), [initialConsent]);

  // Beklerken: önce "hesaplanıyor", sonra "yorum yazılıyor"
  useEffect(() => {
    if (!pending) return setPhase(0);
    const id = setTimeout(() => setPhase(1), 1200);
    return () => clearTimeout(id);
  }, [pending]);

  const locked = urges < minUrges;

  function analyze(withConsent = false) {
    setError(null);
    startTransition(async () => {
      if (withConsent) {
        await setAiConsent(true);
        setConsent(true);
      }
      const res: AnalysisResult = await runAnalysis({ period, behaviorId });
      if (res.ok) {
        setLatest({ body: res.body, source: res.source, createdAt: res.createdAt, lines: res.lines });
        setLimited(res.limited);
      } else {
        setError(t(`errors.${res.error}`, { min: minUrges }));
      }
    });
  }

  function revoke() {
    startTransition(async () => {
      await setAiConsent(false);
      setConsent(false);
      setLatest(null);
    });
  }

  if (locked) {
    return (
      <section className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground">
          <Sparkles className="size-7" strokeWidth={1.75} aria-hidden />
        </span>
        <h2 className="text-question">{t("lockedTitle")}</h2>
        <p className="max-w-xs text-muted-foreground">{t("lockedBody", { min: minUrges })}</p>
        <div className="flex w-full max-w-xs flex-col gap-1.5">
          <div className="h-2 rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (urges / minUrges) * 100)}%` }} />
          </div>
          <span className="numeric text-sm font-semibold text-muted-foreground">{t("progress", { count: urges, min: minUrges })}</span>
        </div>
      </section>
    );
  }

  if (!consent) {
    return (
      <section className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-[0_1px_2px_oklch(0_0_0/0.04)]">
        <span className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
        <h2 className="text-xl font-semibold">{t("consentTitle")}</h2>
        <ul className="flex flex-col gap-2 text-muted-foreground">
          <li>{t("consent1")}</li>
          <li>{t("consent2")}</li>
          <li>{t("consent3")}</li>
        </ul>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <PrimaryButton onClick={() => analyze(true)} loading={pending}>
          {t("consentButton")}
        </PrimaryButton>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="wait" initial={false}>
        {pending ? (
          <motion.section
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 rounded-card bg-card p-8 text-center shadow-[0_1px_2px_oklch(0_0_0/0.04)]"
            aria-live="polite"
          >
            <motion.span
              className="grid size-14 place-items-center rounded-full bg-accent text-primary"
              animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="size-7" aria-hidden />
            </motion.span>
            <p className="font-semibold">{phase === 0 ? t("working1") : t("working2")}</p>
          </motion.section>
        ) : latest ? (
          <motion.article
            key={latest.createdAt}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-[0_1px_2px_oklch(0_0_0/0.04)]"
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Sparkles className="size-4 text-primary" aria-hidden />
              {latest.source === "ai" ? t("sourceAi") : t("sourceTemplate")}
              <span aria-hidden>·</span>
              {new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
                new Date(latest.createdAt),
              )}
            </span>
            <div className="flex flex-col gap-3 text-lg leading-relaxed">
              {latest.body.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
            </div>
            <details className="group rounded-xl bg-muted/60 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-semibold text-muted-foreground">{t("basedOn")}</summary>
              <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-muted-foreground">
                {latest.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </details>
            <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
          </motion.article>
        ) : (
          <motion.section
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 rounded-card bg-card p-8 text-center shadow-[0_1px_2px_oklch(0_0_0/0.04)]"
          >
            <span className="grid size-14 place-items-center rounded-full bg-accent text-primary">
              <Sparkles className="size-7" aria-hidden />
            </span>
            <p className="max-w-xs text-muted-foreground">{t("readyBody")}</p>
          </motion.section>
        )}
      </AnimatePresence>

      {limited && <p className="text-sm text-muted-foreground">{t("limited")}</p>}
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

      <PrimaryButton onClick={() => analyze()} loading={pending}>
        {latest ? t("again") : t("run")}
      </PrimaryButton>
      <button
        type="button"
        onClick={revoke}
        disabled={pending}
        className="tap-target-sm self-center text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {t("revoke")}
      </button>
    </div>
  );
}
