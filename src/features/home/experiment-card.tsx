import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { describeRule, loadResults } from "@/features/experiments/load";
import { daysLeft, type Experiment, isFinished } from "@/features/experiments/shared";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Ana sayfada devam eden haftalık deneyin kısa özeti
export async function ExperimentCard({ supabase, experiment, today }: { supabase: Supabase; experiment: Experiment; today: string }) {
  const t = await getTranslations("experiment");
  const [rule, r] = await Promise.all([describeRule(supabase, experiment), loadResults(supabase, experiment.id)]);
  const finished = isFinished(experiment, today);

  return (
    <Link
      href="/experiment"
      className="flex items-center gap-3 rounded-card bg-card p-4 shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-colors hover:bg-accent/60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
        <FlaskConical className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-semibold text-muted-foreground">
          {finished ? t("cardFinished") : t("cardTitle")}
        </span>
        <span className="truncate font-semibold">{rule.steps.slice(0, 2).join(" → ")}</span>
        <span className="text-sm text-muted-foreground">
          {finished
            ? t("cardSeeResult")
            : `${t("cardProgress", { applied: r.applied, opportunities: r.opportunities })} · ${t("daysLeft", {
                count: daysLeft(experiment.ends_on, today),
              })}`}
        </span>
      </span>
    </Link>
  );
}
