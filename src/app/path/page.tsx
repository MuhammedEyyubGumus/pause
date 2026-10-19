import { ArrowLeft, Route } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { behaviorLabel } from "@/features/history/labels";
import {
  HEAT_MIN_URGES,
  heatMax,
  layoutPath,
  parseTimeline,
  pathSummary,
  TREND_MIN_WEEKS,
  weeksWithData,
} from "@/features/path/build-path";
import { Heatmap, TrendChart } from "@/features/path/charts";
import { PathView } from "@/features/path/path-view";
import { requireOnboardedUser } from "@/lib/auth";
import { localParts } from "@/lib/time/local";
import { cn } from "@/lib/utils";

// "Yolun": her dürtü kaydı yolda bir adım; haftalık eğilim ve zaman ısı haritası.
// Brief bölüm 36: yalnızca ilerleme görseli, ölçüm iddiası yok.
export default async function PathPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const params = await searchParams;
  const { supabase, profile } = await requireOnboardedUser();
  const t = await getTranslations("path");
  const tb = await getTranslations("behaviors");
  const locale = await getLocale();
  const today = localParts(new Date(), profile.timezone).date;

  const { data: behaviors } = await supabase
    .from("behaviors")
    .select("id, name, template_key")
    .is("archived_at", null)
    .order("sort_order");
  const behaviorId = behaviors?.some((b) => b.id === params.b) ? params.b! : null;

  const { data: raw, error } = await supabase.rpc("get_timeline", {
    p_today: today,
    ...(behaviorId ? { p_behavior: behaviorId } : {}),
  });
  if (error) throw error;

  const timeline = parseTimeline(raw);
  const layout = layoutPath(timeline.events);
  const summary = pathSummary(timeline.events);
  const max = heatMax(timeline.heat);
  const trendReady = weeksWithData(timeline.weeks) >= TREND_MIN_WEEKS;
  const heatReady = timeline.total >= HEAT_MIN_URGES;

  const weekFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  // 2024-01-01 bir Pazartesi: Pzt..Paz kısa adları
  const dayLabels = Array.from({ length: 7 }, (_, i) => dayFmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
  const href = (b: string | null) => (b ? `/path?b=${b}` : "/path");

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

      {(behaviors?.length ?? 0) > 1 && (
        <nav
          aria-label={t("behaviorLabel")}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {[{ id: null, label: t("allBehaviors") }, ...behaviors!.map((b) => ({ id: b.id, label: behaviorLabel(b, tb) }))].map(
            ({ id, label }) => (
              <Link
                key={id ?? "all"}
                href={href(id)}
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

      <main className="flex flex-col gap-4 py-4">
        {timeline.total === 0 ? (
          <section className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground">
              <Route className="size-7" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="text-question">{t("emptyTitle")}</h2>
            <p className="max-w-xs text-muted-foreground">{t("emptyBody")}</p>
          </section>
        ) : (
          <>
            {/* Yol */}
            <section className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-[0_1px_2px_oklch(0_0_0/0.04)]">
              <div className="flex flex-col gap-1">
                <p className="text-question">{t("headline", { count: timeline.total })}</p>
                <p className="text-sm text-muted-foreground">
                  {[
                    t("statKept", { count: summary.kept }),
                    t("statPaused", { count: summary.paused }),
                    t("statTools", { count: summary.tools }),
                  ].join(" · ")}
                </p>
                {timeline.total > timeline.events.length && (
                  <p className="text-xs text-muted-foreground">{t("lastSteps", { count: timeline.events.length })}</p>
                )}
              </div>
              <PathView
                points={layout.points}
                d={layout.d}
                width={layout.width}
                height={layout.height}
                ariaLabel={t("pathAria", { count: timeline.events.length, kept: summary.kept })}
                topLabel={t("now")}
                bottomLabel={t("start")}
              />
              <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted-foreground">
                <Legend swatch={<circle cx={9} cy={9} r={6} className="fill-primary" />} label={t("legend.kept")} />
                <Legend swatch={<circle cx={9} cy={9} r={6} className="fill-primary/55" />} label={t("legend.stopped")} />
                <Legend
                  swatch={<circle cx={9} cy={9} r={5} className="fill-card stroke-muted-foreground stroke-2" />}
                  label={t("legend.occurred")}
                />
                <Legend swatch={<circle cx={9} cy={9} r={3.5} className="fill-muted-foreground/40" />} label={t("legend.open")} />
                <Legend
                  swatch={
                    <>
                      <circle cx={9} cy={9} r={8} className="fill-none stroke-primary/35" strokeWidth={1.5} />
                      <circle cx={9} cy={9} r={4} className="fill-primary" />
                    </>
                  }
                  label={t("legend.paused")}
                />
                <Legend
                  swatch={<path d="M9 1 l3 5 l5 3 l-5 3 l-3 5 l-3 -5 l-5 -3 l5 -3 z" className="fill-primary" />}
                  label={t("legend.newTool")}
                />
              </ul>
            </section>

            {/* Haftalık eğilim */}
            <section className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-[0_1px_2px_oklch(0_0_0/0.04)]">
              <div className="flex flex-col gap-0.5">
                <h2 className="font-semibold">{t("trendTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("trendSub", { weeks: timeline.weeks.length })}</p>
              </div>
              {trendReady ? (
                <>
                  <TrendChart
                    weeks={timeline.weeks}
                    weekLabel={(s) => weekFmt.format(new Date(`${s}T00:00:00Z`))}
                    ariaLabel={t("trendTitle")}
                  />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <svg viewBox="0 0 18 4" className="h-1 w-4" aria-hidden>
                        <line x1={0} x2={18} y1={2} y2={2} className="stroke-muted-foreground/60" strokeWidth={2.5} strokeDasharray="4 3" />
                      </svg>
                      {t("before")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <svg viewBox="0 0 18 4" className="h-1 w-4" aria-hidden>
                        <line x1={0} x2={18} y1={2} y2={2} className="stroke-primary" strokeWidth={3} />
                      </svg>
                      {t("after")}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("trendLocked", { min: TREND_MIN_WEEKS })}</p>
              )}
            </section>

            {/* Isı haritası */}
            <section className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-[0_1px_2px_oklch(0_0_0/0.04)]">
              <div className="flex flex-col gap-0.5">
                <h2 className="font-semibold">{t("heatTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("heatSub")}</p>
              </div>
              {heatReady ? (
                <Heatmap heat={timeline.heat} max={max} dayLabels={dayLabels} ariaLabel={t("heatTitle")} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("heatLocked", { min: HEAT_MIN_URGES, count: timeline.total })}
                </p>
              )}
            </section>

            <p className="text-xs text-muted-foreground">{t("note")}</p>
          </>
        )}
      </main>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <svg viewBox="0 0 18 18" className="size-4 shrink-0 overflow-visible" aria-hidden>
        {swatch}
      </svg>
      {label}
    </li>
  );
}
