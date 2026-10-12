import { ArrowLeft, Clock, Compass, Gauge, Scissors, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { behaviorLabel, optionLabel } from "@/features/history/labels";
import { parseInsights } from "@/features/insights/analyze";
import { fmtChange, fmtHour, fmtScore } from "@/features/insights/format";
import { buildMap, MAP_MIN_URGES } from "@/features/map/build-map";
import { addDays } from "@/features/review/build-story";
import { OptionIcon } from "@/features/urge-flow/option-visuals";
import { requireOnboardedUser } from "@/lib/auth";
import { localParts } from "@/lib/time/local";
import { cn } from "@/lib/utils";

// Kişisel Davranış Haritası (brief bölüm 24). Her açılışta güncel veriden hesaplanır.
export default async function MapPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const params = await searchParams;
  const { supabase, profile } = await requireOnboardedUser();
  const t = await getTranslations("map");
  const tb = await getTranslations("behaviors");
  const tOpt = await getTranslations("options");
  const tr = await getTranslations("reflect.steps");
  const locale = await getLocale();
  const today = localParts(new Date(), profile.timezone).date;

  const { data: behaviors } = await supabase
    .from("behaviors")
    .select("id, name, template_key")
    .is("archived_at", null)
    .order("sort_order");
  const behaviorId = behaviors?.some((b) => b.id === params.b) ? params.b! : null;

  const insights = async (from?: string, to?: string) => {
    const { data, error } = await supabase.rpc("get_insights", {
      ...(from ? { p_from: from } : {}),
      ...(to ? { p_to: to } : {}),
      ...(behaviorId ? { p_behavior: behaviorId } : {}),
    });
    if (error) throw error;
    return parseInsights(data);
  };

  let reflections = supabase.from("reflections").select("cut_point, urge_events!inner(behavior_id)");
  if (behaviorId) reflections = reflections.eq("urge_events.behavior_id", behaviorId);

  const [all, recent, previous, { data: cuts }] = await Promise.all([
    insights(),
    insights(addDays(today, -29), today),
    insights(addDays(today, -59), addDays(today, -30)),
    reflections,
  ]);
  const map = buildMap(all, recent, previous, (cuts ?? []).map((c) => c.cut_point));
  const locked = map.urges < MAP_MIN_URGES;
  const unknown = t("unknown");

  const items: { key: string; icon: ReactNode; label: string; value: string | null; sub?: string }[] = [
    {
      key: "trigger",
      icon: map.trigger ? <OptionIcon option={{ kind: "trigger", key: map.trigger.key }} className="size-5" /> : <Compass className="size-5" />,
      label: t("trigger"),
      value: map.trigger ? optionLabel({ ...map.trigger, kind: "trigger" }, tOpt) : null,
    },
    {
      key: "time",
      icon: <Clock className="size-5" />,
      label: t("time"),
      value: map.peak ? `${fmtHour(map.peak.start)}–${fmtHour(map.peak.end)}` : null,
    },
    {
      key: "emotion",
      icon: map.emotion ? <OptionIcon option={{ kind: "emotion", key: map.emotion.key }} className="size-5" /> : <Compass className="size-5" />,
      label: t("emotion"),
      value: map.emotion ? optionLabel({ ...map.emotion, kind: "emotion" }, tOpt) : null,
    },
    {
      key: "avgUrge",
      icon: <Gauge className="size-5" />,
      label: t("avgUrge"),
      value: map.avgUrge != null ? `${fmtScore(map.avgUrge, locale)} / 10` : null,
    },
    {
      key: "alternative",
      icon: map.alternative ? (
        <OptionIcon option={{ kind: "intervention", key: map.alternative.key }} className="size-5" />
      ) : (
        <Compass className="size-5" />
      ),
      label: t("alternative"),
      value: map.alternative ? optionLabel({ ...map.alternative, kind: "intervention" }, tOpt) : null,
      sub: map.alternative
        ? t("alternativeSub", { value: fmtChange(map.alternative.avg_change, locale), count: map.alternative.n })
        : t("alternativeHint"),
    },
    {
      key: "cutPoint",
      icon: <Scissors className="size-5" />,
      label: t("cutPoint"),
      value: map.cutPoint ? tr(map.cutPoint) : null,
      sub: map.cutPoint ? undefined : t("cutPointHint"),
    },
    {
      key: "growth",
      icon: <TrendingUp className="size-5" />,
      label: t("growth"),
      value: map.growth ? t(`growthAreas.${map.growth}`) : null,
      sub: map.growth ? t("growthSub") : t("growthHint"),
    },
  ];

  const href = (b: string | null) => (b ? `/map?b=${b}` : "/map");

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

      <main className="flex flex-1 flex-col gap-4 py-4">
        {locked ? (
          <section className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground">
              <Compass className="size-7" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="text-question">{t("lockedTitle")}</h2>
            <p className="max-w-xs text-muted-foreground">{t("lockedBody", { min: MAP_MIN_URGES })}</p>
            <div className="flex w-full max-w-xs flex-col gap-1.5">
              <div className="h-2 rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (map.urges / MAP_MIN_URGES) * 100)}%` }}
                />
              </div>
              <span className="numeric text-sm font-semibold text-muted-foreground">
                {t("progress", { count: map.urges, min: MAP_MIN_URGES })}
              </span>
            </div>
          </section>
        ) : (
          <>
            <p className="text-muted-foreground">{t("intro", { count: map.urges })}</p>
            {/* Harita: dikey bir yol üzerinde duraklar */}
            <ol className="relative flex flex-col gap-3">
              <span className="absolute start-5 top-6 bottom-6 w-0.5 -translate-x-1/2 bg-border rtl:translate-x-1/2" aria-hidden />
              {items.map((it, i) => (
                <li
                  key={it.key}
                  className="animate-fade-up relative flex items-start gap-4"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span
                    className={cn(
                      "relative z-10 grid size-10 shrink-0 place-items-center rounded-full",
                      it.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-2 ring-border",
                    )}
                    aria-hidden
                  >
                    {it.icon}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-card bg-card p-4 shadow-[0_1px_2px_oklch(0_0_0/0.04)]">
                    <span className="text-xs font-semibold text-muted-foreground">{it.label}</span>
                    <span className={cn("text-lg font-semibold", !it.value && "text-muted-foreground")}>{it.value ?? unknown}</span>
                    {it.sub && <span className="text-sm text-muted-foreground">{it.sub}</span>}
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">{t("note")}</p>
          </>
        )}
      </main>
    </div>
  );
}
