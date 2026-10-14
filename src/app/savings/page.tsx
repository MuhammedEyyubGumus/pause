import { ArrowLeft, ArrowRight, ChevronRight, NotebookPen, PiggyBank } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { behaviorLabel, optionLabel } from "@/features/history/labels";
import { fmtMoney, parseSavings, totals } from "@/features/savings/shared";
import { requireOnboardedUser } from "@/lib/auth";
import { formatDayHeading } from "@/lib/time/format";
import { localParts } from "@/lib/time/local";
import { cn } from "@/lib/utils";

type Lesson = {
  id: string;
  behavior_id: string;
  local_date: string;
  outcome_class: string | null;
  notes: string | null;
  reflection: {
    thought: string | null;
    first_action: string | null;
    cut_point: string | null;
    next_option_id: string | null;
  } | null;
};

// Tasarruf ve dersler: dürtü gelip davranış yapılmayınca harcanmayan para ve
// davranış gerçekleştiğinde zincir incelemesinden / notlardan çıkan dersler.
export default async function SavingsPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const params = await searchParams;
  const { supabase, profile } = await requireOnboardedUser();
  const t = await getTranslations("savings");
  const tb = await getTranslations("behaviors");
  const tOpt = await getTranslations("options");
  const tSteps = await getTranslations("reflect.steps");
  const th = await getTranslations("history");
  const locale = await getLocale();
  const today = localParts(new Date(), profile.timezone).date;

  const { data: behaviors } = await supabase
    .from("behaviors")
    .select("id, name, template_key, cost_amount, cost_currency")
    .is("archived_at", null)
    .order("sort_order");
  const behaviorId = behaviors?.some((b) => b.id === params.b) ? params.b! : null;
  const behaviorById = new Map((behaviors ?? []).map((b) => [b.id, b]));

  let lessonsQuery = supabase
    .from("urge_events")
    .select("id, behavior_id, local_date, outcome_class, notes, reflections(thought, first_action, cut_point, next_option_id)")
    .in("outcome_class", ["occurred", "stopped_early"])
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(30);
  if (behaviorId) lessonsQuery = lessonsQuery.eq("behavior_id", behaviorId);

  const [{ data: raw, error }, { data: lessonRows }, { data: interventions }] = await Promise.all([
    supabase.rpc("get_savings", behaviorId ? { p_behavior: behaviorId } : {}),
    lessonsQuery,
    supabase.from("options").select("id, kind, key, label").eq("kind", "intervention"),
  ]);
  if (error) throw error;

  const rows = parseSavings(raw);
  const sum = totals(rows);
  const optionById = new Map((interventions ?? []).map((o) => [o.id, o]));

  // İnceleme ilişkisi bire bir olduğu için nesne ya da dizi gelebilir
  const lessons: Lesson[] = (lessonRows ?? [])
    .map((e) => {
      const r = e.reflections as unknown;
      const reflection = (Array.isArray(r) ? r[0] : r) as Lesson["reflection"] | undefined;
      return { ...e, reflection: reflection ?? null } as Lesson;
    })
    .filter(
      (l) => l.notes || (l.reflection && (l.reflection.thought || l.reflection.first_action || l.reflection.next_option_id)),
    );

  const selected = behaviorId ? behaviorById.get(behaviorId) : undefined;
  const costMissing = behaviorId ? selected?.cost_amount == null : !sum.anyCost;
  const href = (b: string | null) => (b ? `/savings?b=${b}` : "/savings");

  const counts = [
    { key: "notDone", value: sum.not_done },
    { key: "stoppedEarly", value: sum.stopped_early },
    { key: "occurred", value: sum.occurred },
    { key: "open", value: sum.open },
  ] as const;

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
        {/* Harcanmayan para */}
        <section className="flex flex-col gap-3 rounded-card bg-pause p-5 text-pause-foreground">
          <span className="flex items-center gap-2 text-sm font-semibold opacity-80">
            <PiggyBank className="size-5" aria-hidden />
            {t("savedTitle")}
          </span>
          {sum.saved.length > 0 ? (
            <>
              <p className="numeric text-5xl leading-none font-bold">
                {sum.saved.map((s) => fmtMoney(s.amount, s.currency, locale)).join(" + ")}
              </p>
              <p className="opacity-80">{t("savedBody", { count: sum.not_done })}</p>
            </>
          ) : (
            <p className="opacity-80">{t("noCost")}</p>
          )}
          {costMissing && (
            <Link
              href={selected ? `/settings/behaviors/${selected.id}` : "/settings"}
              className="tap-target-sm inline-flex items-center gap-1 self-start font-semibold text-pause-ring"
            >
              {t("setCost")}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
            </Link>
          )}
        </section>

        {/* Dürtü geldiğinde ne oldu */}
        <section className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-[0_1px_2px_oklch(0_0_0/0.04)]">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("countsTitle", { count: sum.urges })}</h2>
          <ul className="flex flex-col gap-3">
            {counts.map(({ key, value }) => (
              <li key={key} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold">{t(`counts.${key}`)}</span>
                  <span className="numeric text-muted-foreground">{value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted" aria-hidden>
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${sum.urges ? Math.max((value / sum.urges) * 100, value ? 3 : 0) : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          {sum.occurred > 0 && <p className="text-sm text-muted-foreground">{t("occurredNote")}</p>}
        </section>

        {/* Dersler */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("lessonsTitle")}</h2>
          {lessons.length === 0 ? (
            <p className="rounded-card bg-card p-5 text-muted-foreground">{t("lessonsEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lessons.map((l) => {
                const next = l.reflection?.next_option_id ? optionById.get(l.reflection.next_option_id) : undefined;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/history/${l.id}`}
                      className="flex flex-col gap-2 rounded-card bg-card p-4 shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-colors hover:bg-accent/60"
                    >
                      <span className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
                        <span>
                          {formatDayHeading(l.local_date, today, locale, { today: th("today"), yesterday: th("yesterday") })}
                          {!behaviorId && behaviorById.get(l.behavior_id) && ` · ${behaviorLabel(behaviorById.get(l.behavior_id), tb)}`}
                        </span>
                        <span>{l.outcome_class === "stopped_early" ? t("counts.stoppedEarly") : t("counts.occurred")}</span>
                      </span>
                      {l.reflection?.thought && (
                        <p className="text-sm">
                          <span className="font-semibold">{t("thought")}: </span>
                          {l.reflection.thought}
                        </p>
                      )}
                      {l.reflection?.first_action && (
                        <p className="text-sm">
                          <span className="font-semibold">{t("firstAction")}: </span>
                          {l.reflection.first_action}
                        </p>
                      )}
                      {l.reflection?.cut_point && next && (
                        <p className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">
                          {t("nextTime", {
                            step: tSteps(l.reflection.cut_point),
                            option: optionLabel(next, tOpt),
                          })}
                        </p>
                      )}
                      {l.notes && (
                        <p className="flex gap-1.5 text-sm text-muted-foreground italic">
                          <NotebookPen className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          <span className="line-clamp-3">{l.notes}</span>
                        </p>
                      )}
                      <span className="flex justify-end text-muted-foreground" aria-hidden>
                        <ChevronRight className="size-4 rtl:rotate-180" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
