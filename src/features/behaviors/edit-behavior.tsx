"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ReactNode, useState, useTransition } from "react";

import { BehaviorIcon } from "@/components/pause/behavior-icon";
import { PrimaryButton } from "@/components/pause/primary-button";
import { cn } from "@/lib/utils";

import { archiveBehavior, updateBehavior } from "./actions";
import {
  BEHAVIOR_GOALS,
  type BehaviorGoal,
  CURRENCIES,
  type Currency,
  isTemplateKey,
  MONEY_TEMPLATES,
  PAUSE_MINUTES,
} from "./templates";

type Behavior = {
  id: string;
  name: string;
  icon: string;
  template_key: string | null;
  why: string | null;
  goal: BehaviorGoal;
  goal_text: string | null;
  pause_minutes: number;
  cost_amount: number | null;
  cost_currency: string;
};

export function EditBehavior({ behavior, isOnlyBehavior }: { behavior: Behavior; isOnlyBehavior: boolean }) {
  const t = useTranslations("behaviorSettings");
  const tb = useTranslations("behaviors");
  const to = useTranslations("onboarding");
  const tc = useTranslations("common");

  const isCustom = !isTemplateKey(behavior.template_key);
  const title = isTemplateKey(behavior.template_key) ? tb(behavior.template_key) : behavior.name;

  const [name, setName] = useState(behavior.name);
  const [why, setWhy] = useState(behavior.why ?? "");
  const [goal, setGoal] = useState<BehaviorGoal>(behavior.goal);
  const [goalText, setGoalText] = useState(behavior.goal_text ?? "");
  const [minutes, setMinutes] = useState(behavior.pause_minutes);
  const [cost, setCost] = useState(behavior.cost_amount != null ? String(behavior.cost_amount) : "");
  const [currency, setCurrency] = useState<Currency>(
    (CURRENCIES as readonly string[]).includes(behavior.cost_currency) ? (behavior.cost_currency as Currency) : "TRY",
  );
  const [costOpen, setCostOpen] = useState(
    behavior.cost_amount != null || MONEY_TEMPLATES.includes(behavior.template_key ?? ""),
  );
  // "7,50" ve "7.50" ikisi de kabul edilir
  const costValue = cost.trim() === "" ? null : Number(cost.replace(",", "."));
  const costInvalid = costValue != null && (!Number.isFinite(costValue) || costValue < 0 || costValue > 100000);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    start(async () => {
      const result = await updateBehavior({
        id: behavior.id,
        name: isCustom ? name : undefined,
        why,
        goal,
        goalText,
        pauseMinutes: minutes,
        costAmount: costOpen ? costValue : null,
        costCurrency: currency,
      });
      if (result && !result.ok) setError(tc("error"));
    });
  }

  function archive() {
    setError(null);
    start(async () => {
      const result = await archiveBehavior(behavior.id);
      if (result && !result.ok) setError(result.error === "last_active" ? t("lastActive") : tc("error"));
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex h-14 items-center gap-2">
        <Link
          href="/settings"
          aria-label={tc("back")}
          className="tap-target-sm -ms-3 grid place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-6 rtl:rotate-180" />
        </Link>
        <span className="grid size-9 place-items-center rounded-full bg-muted">
          <BehaviorIcon name={behavior.icon} className="size-5" />
        </span>
        <h1 className="truncate text-xl font-semibold">{title}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-8 py-4">
        {isCustom && (
          <Field title={t("nameLabel")}>
            <input
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              className="tap-target rounded-xl border-2 border-transparent bg-card px-4 outline-none focus:border-primary"
            />
          </Field>
        )}

        <Field title={t("pauseLabel")} hint={t("pauseHint")}>
          <div className="grid grid-cols-4 gap-2 rounded-xl bg-muted p-1" role="radiogroup">
            {PAUSE_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={minutes === m}
                onClick={() => setMinutes(m)}
                className={cn(
                  "tap-target-sm rounded-lg font-semibold transition-colors",
                  minutes === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {t("minutes", { minutes: m })}
              </button>
            ))}
          </div>
        </Field>

        <Field title={t("goalLabel")}>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {BEHAVIOR_GOALS.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={goal === g}
                onClick={() => setGoal(g)}
                className={cn(
                  "tap-target rounded-xl border-2 px-3 font-semibold transition-colors",
                  goal === g ? "border-primary bg-accent text-accent-foreground" : "border-transparent bg-card",
                )}
              >
                {t(`goals.${g}`)}
              </button>
            ))}
          </div>
          {goal === "custom" && (
            <input
              value={goalText}
              maxLength={140}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder={t("goalTextPlaceholder")}
              className="tap-target rounded-xl border-2 border-transparent bg-card px-4 outline-none focus:border-primary"
            />
          )}
          {/* Alkolü aniden bırakmak tıbbi risk taşıyabilir */}
          {goal === "quit" && behavior.template_key === "alcohol" && (
            <p className="rounded-xl bg-accent p-4 text-sm text-accent-foreground">{to("safetyAlcohol")}</p>
          )}
        </Field>

        <Field title={t("costLabel")} hint={costOpen ? t("costHint") : undefined}>
          {costOpen ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value.replace(/[^\d.,]/g, ""))}
                  placeholder={t("costPlaceholder")}
                  aria-invalid={costInvalid || undefined}
                  className="tap-target numeric min-w-0 flex-1 rounded-xl border-2 border-transparent bg-card px-4 text-lg outline-none focus:border-primary aria-invalid:border-destructive"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  aria-label={t("currency")}
                  className="tap-target rounded-xl border-2 border-transparent bg-card px-3 font-semibold outline-none focus:border-primary"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {costInvalid && <p className="text-sm text-destructive">{t("costInvalid")}</p>}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCostOpen(true)}
              className="tap-target-sm self-start font-semibold text-primary"
            >
              {t("costAdd")}
            </button>
          )}
        </Field>

        <Field title={t("whyLabel")} hint={t("whyHint")}>
          <textarea
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder={t("whyPlaceholder")}
            className="w-full resize-none rounded-xl border-2 border-transparent bg-card p-4 outline-none focus:border-primary"
          />
        </Field>

        <section className="flex flex-col gap-3 border-t border-border pt-6">
          {confirmArchive ? (
            <div className="flex flex-col gap-3 rounded-card bg-card p-4">
              <p className="font-medium">{t("archiveConfirm")}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmArchive(false)}
                  className="tap-target rounded-xl bg-muted font-semibold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={archive}
                  disabled={pending}
                  className="tap-target rounded-xl bg-foreground font-semibold text-background disabled:opacity-50"
                >
                  {t("archive")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmArchive(true)}
              disabled={isOnlyBehavior}
              className="tap-target-sm self-start font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {t("archive")}
            </button>
          )}
          {isOnlyBehavior && <p className="text-sm text-muted-foreground">{t("lastActive")}</p>}
        </section>
      </main>

      <footer className="sticky bottom-0 flex flex-col gap-2 bg-background/90 pt-2 pb-safe backdrop-blur">
        {error && (
          <p role="alert" className="text-center text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <PrimaryButton onClick={save} loading={pending} disabled={(isCustom && !name.trim()) || (costOpen && costInvalid)}>
          {t("save")}
        </PrimaryButton>
      </footer>
    </div>
  );
}

function Field({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
