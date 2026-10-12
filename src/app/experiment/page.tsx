import { ArrowLeft, FlaskConical } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EndExperimentButton } from "@/features/experiments/end-button";
import { describeRule, loadActiveExperiment, loadResults } from "@/features/experiments/load";
import { daysLeft, EXPERIMENT_COLUMNS, type Experiment, isFinished } from "@/features/experiments/shared";
import { ResultsView, RuleChain } from "@/features/experiments/views";
import { requireOnboardedUser } from "@/lib/auth";
import { localParts } from "@/lib/time/local";

// Haftalık deney (brief bölüm 26): devam eden deney, sonucu ve geçmiş deneyler
export default async function ExperimentPage() {
  const { supabase, profile } = await requireOnboardedUser();
  const t = await getTranslations("experiment");
  const today = localParts(new Date(), profile.timezone).date;

  let active = await loadActiveExperiment(supabase);
  let justFinished: Experiment | null = null;

  // Süresi dolmuş deney: "tamamlandı" olarak işaretle ve sonucunu göster
  if (active && isFinished(active, today)) {
    await supabase
      .from("experiments")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", active.id);
    justFinished = { ...active, status: "completed" };
    active = null;
  }

  const { data: pastRows } = await supabase
    .from("experiments")
    .select(EXPERIMENT_COLUMNS)
    .neq("status", "active")
    .order("created_at", { ascending: false })
    .limit(6);
  const past = ((pastRows ?? []) as Experiment[]).filter((x) => x.id !== justFinished?.id);

  const current = active ?? justFinished;
  const [rule, results] = current
    ? await Promise.all([describeRule(supabase, current), loadResults(supabase, current.id)])
    : [null, null];
  const pastDetails = await Promise.all(
    past.map(async (x) => ({ x, rule: await describeRule(supabase, x), r: await loadResults(supabase, x.id) })),
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex h-14 items-center gap-2">
        <Link
          href="/insights"
          aria-label={t("back")}
          className="tap-target-sm -ms-3 grid place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-6 rtl:rotate-180" />
        </Link>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-6 py-4">
        {current && rule && results ? (
          <section className="flex flex-col gap-5 rounded-card bg-card p-5 shadow-[0_1px_2px_oklch(0_0_0/0.04)]">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {justFinished ? t("finishedTitle") : t("activeTitle")}
              </h2>
              {active && (
                <span className="numeric text-sm font-semibold text-primary">
                  {t("daysLeft", { count: daysLeft(active.ends_on, today) })}
                </span>
              )}
            </div>
            {rule.behavior && <p className="text-sm font-semibold">{rule.behavior}</p>}
            <RuleChain steps={rule.steps} />
            <ResultsView r={results} />
            {active && results.opportunities === 0 && <p className="text-sm text-muted-foreground">{t("waiting")}</p>}
          </section>
        ) : (
          <section className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground">
              <FlaskConical className="size-7" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="text-question">{t("emptyTitle")}</h2>
            <p className="max-w-xs text-muted-foreground">{t("emptyBody")}</p>
          </section>
        )}

        <div className="flex flex-col gap-2">
          {!active && (
            <Link
              href="/experiment/new"
              className="tap-target inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 text-lg font-semibold text-primary-foreground"
            >
              {t("startNew")}
            </Link>
          )}
          {active && <EndExperimentButton id={active.id} />}
        </div>

        {pastDetails.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{t("pastTitle")}</h2>
            <ul className="flex flex-col gap-2">
              {pastDetails.map(({ x, rule: pr, r }) => (
                <li key={x.id} className="flex flex-col gap-2 rounded-card bg-card p-4">
                  <RuleChain steps={pr.steps} compact />
                  <p className="text-sm text-muted-foreground">
                    {t("pastSummary", { applied: r.applied, opportunities: r.opportunities })}
                    {x.status === "abandoned" && ` · ${t("abandoned")}`}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
