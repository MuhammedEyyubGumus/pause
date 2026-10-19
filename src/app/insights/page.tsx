import { ChevronRight, CirclePlay, Compass, FlaskConical, Milestone, PiggyBank, Route, Wrench } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AppNav } from "@/components/pause/app-nav";
import { TrackView } from "@/components/pause/track-view";
import { behaviorLabel } from "@/features/history/labels";
import { parseInsights, parsePeriod, PERIODS, periodStart, type Period } from "@/features/insights/analyze";
import { PairsCard, SummaryCard, TimeCard, TriggersCard, WorksCard } from "@/features/insights/cards";
import { MILESTONES, parseMilestones } from "@/features/milestones/shared";
import { requireOnboardedUser } from "@/lib/auth";
import { SyncAgent } from "@/lib/offline/sync-agent";
import { localParts } from "@/lib/time/local";
import { cn } from "@/lib/utils";

// İlk birkaç kayıtta örüntü kartları yerine bir ilerleme notu gösterilir
const FIRST_INSIGHTS_AT = 3;

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ p?: string; b?: string }> }) {
  const params = await searchParams;
  const { supabase, profile } = await requireOnboardedUser();
  const t = await getTranslations("insights");
  const tb = await getTranslations("behaviors");

  const period = parsePeriod(params.p);
  const today = localParts(new Date(), profile.timezone).date;

  const { data: behaviors } = await supabase
    .from("behaviors")
    .select("id, name, template_key")
    .is("archived_at", null)
    .order("sort_order");
  const behaviorId = behaviors?.some((b) => b.id === params.b) ? params.b! : null;

  const { data: raw, error } = await supabase.rpc("get_insights", {
    p_from: periodStart(today, period) ?? undefined,
    p_behavior: behaviorId ?? undefined,
  });
  if (error) throw error;
  const data = parseInsights(raw);
  const { data: milestoneData } = await supabase.rpc("get_milestones");
  const milestonesDone = parseMilestones(milestoneData).filter((m) => m.achievedAt).length;
  const urges = data.totals.urges;

  const href = (p: Period, b: string | null) => {
    const q = new URLSearchParams();
    if (p !== "30") q.set("p", p);
    if (b) q.set("b", b);
    const s = q.toString();
    return s ? `/insights?${s}` : "/insights";
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe">
      <SyncAgent />
      <TrackView name="insights_viewed" props={{ period, filtered: !!behaviorId }} />
      <header className="flex h-14 items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <div className="-me-2 flex items-center">
          <Link
            href="/experiment"
            aria-label={t("experiment")}
            title={t("experiment")}
            className="tap-target-sm grid place-items-center rounded-full text-primary hover:bg-accent"
          >
            <FlaskConical className="size-5" aria-hidden />
          </Link>
          <Link
            href="/review"
            className="tap-target-sm inline-flex items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary hover:bg-accent"
          >
            <CirclePlay className="size-5" aria-hidden />
            {t("weeklyStory")}
          </Link>
        </div>
      </header>

      {/* Filtreler: tek satır dönem, birden fazla davranış varsa ikinci satır */}
      <nav aria-label={t("periodLabel")} className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={href(p, behaviorId)}
            aria-current={p === period ? "page" : undefined}
            replace
            scroll={false}
            className={cn(
              "tap-target-sm grid place-items-center rounded-lg text-sm font-semibold transition-colors",
              p === period ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`periods.${p}`)}
          </Link>
        ))}
      </nav>

      {(behaviors?.length ?? 0) > 1 && (
        <nav aria-label={t("behaviorLabel")} className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ id: null, label: t("allBehaviors") }, ...behaviors!.map((b) => ({ id: b.id, label: behaviorLabel(b, tb) }))].map(
            ({ id, label }) => (
              <Link
                key={id ?? "all"}
                href={href(period, id)}
                aria-current={id === behaviorId ? "page" : undefined}
                replace
                scroll={false}
                className={cn(
                  "tap-target-sm inline-flex shrink-0 items-center rounded-full border-2 px-4 text-sm font-semibold transition-colors",
                  id === behaviorId
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            ),
          )}
        </nav>
      )}

      <main className="flex flex-1 flex-col gap-4 py-4">
        <Link
          href={behaviorId ? `/map?b=${behaviorId}` : "/map"}
          className="flex items-center gap-3 rounded-card bg-pause p-4 text-pause-foreground transition-transform active:scale-[0.98]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pause-ring text-pause">
            <Compass className="size-5" aria-hidden />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">{t("mapCard")}</span>
            <span className="text-sm opacity-80">{t("mapCardSub")}</span>
          </span>
          <ChevronRight className="size-5 opacity-70 rtl:rotate-180" aria-hidden />
        </Link>
        <Link
          href={behaviorId ? `/path?b=${behaviorId}` : "/path"}
          className="flex items-center gap-3 rounded-card bg-card p-4 shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-colors hover:bg-accent/60"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <Route className="size-5" aria-hidden />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">{t("pathCard")}</span>
            <span className="text-sm text-muted-foreground">{t("pathCardSub")}</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" aria-hidden />
        </Link>
        <Link
          href={behaviorId ? `/toolbox?b=${behaviorId}` : "/toolbox"}
          className="flex items-center gap-3 rounded-card bg-card p-4 shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-colors hover:bg-accent/60"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <Wrench className="size-5" aria-hidden />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">{t("toolboxCard")}</span>
            <span className="text-sm text-muted-foreground">{t("toolboxCardSub")}</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" aria-hidden />
        </Link>
        <Link
          href="/milestones"
          className="flex items-center gap-3 rounded-card bg-card p-4 shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-colors hover:bg-accent/60"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <Milestone className="size-5" aria-hidden />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">{t("milestonesCard")}</span>
            <span className="text-sm text-muted-foreground">
              {t("milestonesCardSub", { done: milestonesDone, total: MILESTONES.length })}
            </span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" aria-hidden />
        </Link>
        <Link
          href={behaviorId ? `/savings?b=${behaviorId}` : "/savings"}
          className="flex items-center gap-3 rounded-card bg-card p-4 shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-colors hover:bg-accent/60"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <PiggyBank className="size-5" aria-hidden />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">{t("savingsCard")}</span>
            <span className="text-sm text-muted-foreground">{t("savingsCardSub")}</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" aria-hidden />
        </Link>
        {urges === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-question">{t("emptyTitle")}</p>
            <p className="max-w-xs text-muted-foreground">{t("emptyBody")}</p>
          </div>
        ) : (
          <>
            {urges < FIRST_INSIGHTS_AT && (
              <aside className="flex flex-col gap-2 rounded-card bg-accent p-5 text-accent-foreground">
                <p className="font-semibold">{t("firstTitle")}</p>
                <p className="text-sm">{t("firstBody")}</p>
                <p className="numeric text-sm font-semibold">{t("progress", { count: urges, min: FIRST_INSIGHTS_AT })}</p>
              </aside>
            )}
            <SummaryCard data={data} />
            <WorksCard data={data} />
            <TriggersCard data={data} />
            <TimeCard data={data} />
            <PairsCard data={data} />
          </>
        )}
      </main>
      <AppNav />
    </div>
  );
}
