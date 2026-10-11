import { ArrowRight, CalendarPlus, ChevronRight, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { AppNav } from "@/components/pause/app-nav";
import { BehaviorIcon } from "@/components/pause/behavior-icon";
import { behaviorLabel, optionLabel } from "@/features/history/labels";
import { OptionIcon } from "@/features/urge-flow/option-visuals";
import { PendingBanner } from "@/features/history/pending-banner";
import { requireOnboardedUser } from "@/lib/auth";
import { SyncAgent } from "@/lib/offline/sync-agent";
import { formatDayHeading, formatTime } from "@/lib/time/format";
import { localParts } from "@/lib/time/local";

const PAGE_SIZE = 40;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { before } = await searchParams;
  const { supabase, user, profile } = await requireOnboardedUser();
  const t = await getTranslations("history");
  const tb = await getTranslations("behaviors");
  const tOpt = await getTranslations("options");
  const locale = await getLocale();
  const today = localParts(new Date(), profile.timezone).date;

  let query = supabase
    .from("urge_events")
    .select(
      "id, behavior_id, occurred_at, local_date, urge_before, urge_after, pause_status, outcome_option_id, emergency_mode, source",
    )
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(PAGE_SIZE + 1);
  // Sayfalama: tarih imleci (yalnızca geçerli bir ISO tarihi kabul edilir)
  if (before && !Number.isNaN(Date.parse(before))) query = query.lt("occurred_at", new Date(before).toISOString());

  const [{ data: rows }, { data: behaviors }, { data: outcomes }] = await Promise.all([
    query,
    supabase.from("behaviors").select("id, name, icon, template_key"),
    supabase.from("options").select("id, kind, key, label").eq("kind", "outcome"),
  ]);

  const events = (rows ?? []).slice(0, PAGE_SIZE);
  const ids = events.map((e) => e.id);

  // Satırda olayın ilk tetikleyicisi ve ilk denenen alternatifi görünür (brief: 💼 İş · 🚪 Ortam değiştir)
  const [{ data: triggerRows }, { data: interventionRows }, { data: chainOptions }] = await Promise.all([
    supabase.from("event_triggers").select("event_id, option_id").in("event_id", ids),
    supabase.from("event_interventions").select("event_id, option_id, position").in("event_id", ids).order("position"),
    supabase.from("options").select("id, kind, key, label").in("kind", ["trigger", "intervention"]),
  ]);
  const chainOptionById = new Map((chainOptions ?? []).map((o) => [o.id, o]));
  const firstOption = (list: { event_id: string; option_id: string }[] | null) => {
    const m = new Map<string, ChainOption>();
    for (const r of list ?? []) {
      const o = chainOptionById.get(r.option_id);
      if (o && !m.has(r.event_id)) m.set(r.event_id, o);
    }
    return m;
  };
  const triggerByEvent = firstOption(triggerRows);
  const interventionByEvent = firstOption(interventionRows);
  const hasMore = (rows?.length ?? 0) > PAGE_SIZE;
  const behaviorById = new Map((behaviors ?? []).map((b) => [b.id, b]));
  const outcomeById = new Map((outcomes ?? []).map((o) => [o.id, o]));

  // Gün gün grupla (olayın kendi yerel tarihine göre)
  const days: { date: string; items: typeof events }[] = [];
  for (const ev of events) {
    const last = days.at(-1);
    if (last && last.date === ev.local_date) last.items.push(ev);
    else days.push({ date: ev.local_date, items: [ev] });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe">
      <SyncAgent />
      <header className="flex h-14 items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <Link
          href="/history/new"
          className="tap-target-sm -me-2 inline-flex items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary hover:bg-accent"
        >
          <CalendarPlus className="size-5" aria-hidden />
          {t("addLater")}
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-6 py-4">
        <PendingBanner userId={user.id} />

        {days.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-question">{t("emptyTitle")}</p>
            <p className="max-w-xs text-muted-foreground">{t("emptyBody")}</p>
            <Link href="/history/new" className="tap-target-sm mt-2 font-semibold text-primary">
              {t("addLaterLong")}
            </Link>
          </div>
        )}

        {days.map((day) => {
          const paused = day.items.filter((e) => e.pause_status !== "none").length;
          return (
            <section key={day.date} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="font-semibold">
                  {formatDayHeading(day.date, today, locale, { today: t("today"), yesterday: t("yesterday") })}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {t("daySummary", { urges: day.items.length, pauses: paused })}
                </span>
              </div>

              <ul className="flex flex-col gap-2">
                {day.items.map((ev) => {
                  const b = behaviorById.get(ev.behavior_id);
                  const outcome = ev.outcome_option_id ? outcomeById.get(ev.outcome_option_id) : undefined;
                  return (
                    <li key={ev.id}>
                      <Link
                        href={`/history/${ev.id}`}
                        className="flex items-center gap-3 rounded-card bg-card p-4 shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-colors hover:bg-accent/60"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
                          <BehaviorIcon name={b?.icon} className="size-5" />
                        </span>

                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-semibold">{behaviorLabel(b, tb)}</span>
                            {ev.emergency_mode && <LifeBuoy className="size-4 shrink-0 text-urge-high" aria-label={t("sos")} />}
                          </span>
                          <span className="truncate text-sm text-muted-foreground">
                            {formatTime(ev.occurred_at, locale, profile.timezone)}
                            {ev.source === "retro" && ` · ${t("retro")}`}
                            {outcome
                              ? ` · ${optionLabel(outcome, tOpt).replace(/\.$/, "")}`
                              : ev.pause_status === "active"
                                ? ` · ${t("inProgress")}`
                                : ""}
                          </span>
                          <ChainLine
                            trigger={triggerByEvent.get(ev.id)}
                            intervention={interventionByEvent.get(ev.id)}
                            label={(o) => optionLabel(o, tOpt)}
                          />
                        </span>

                        <Intensity before={ev.urge_before} after={ev.urge_after} />
                        <ChevronRight className="size-5 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {hasMore && (
          <Link
            href={`/history?before=${encodeURIComponent(events.at(-1)!.occurred_at)}`}
            className="tap-target-sm mx-auto inline-flex items-center gap-1 font-semibold text-primary"
          >
            {t("older")}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        )}
      </div>

      <AppNav />
    </div>
  );
}

// "8 → 4" ya da yalnızca "8"
function Intensity({ before, after }: { before: number | null; after: number | null }) {
  if (before == null) return null;
  return (
    <span className="numeric flex shrink-0 items-baseline gap-1 text-sm font-semibold">
      <span className={after != null ? "text-muted-foreground" : undefined}>{before}</span>
      {after != null && (
        <>
          <span className="text-muted-foreground">→</span>
          <span className={after < before ? "text-change-positive" : undefined}>{after}</span>
        </>
      )}
    </span>
  );
}

type ChainOption = { id: string; kind: "trigger" | "intervention" | "emotion" | "outcome"; key: string | null; label: string | null };

// Tetikleyici → denenen alternatif; ikisi de yoksa hiçbir şey gösterilmez
function ChainLine({
  trigger,
  intervention,
  label,
}: {
  trigger?: ChainOption;
  intervention?: ChainOption;
  label: (o: ChainOption) => string;
}) {
  if (!trigger && !intervention) return null;
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
      {trigger && (
        <span className="inline-flex min-w-0 items-center gap-1">
          <OptionIcon option={trigger} className="size-3.5 shrink-0" />
          <span className="truncate">{label(trigger)}</span>
        </span>
      )}
      {trigger && intervention && <span aria-hidden>·</span>}
      {intervention && (
        <span className="inline-flex min-w-0 items-center gap-1">
          <OptionIcon option={intervention} className="size-3.5 shrink-0" />
          <span className="truncate">{label(intervention)}</span>
        </span>
      )}
    </span>
  );
}
