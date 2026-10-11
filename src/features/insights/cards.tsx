import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { optionLabel } from "@/features/history/labels";
import { OptionIcon } from "@/features/urge-flow/option-visuals";
import { cn } from "@/lib/utils";

import {
  bestPairs,
  closestPair,
  dayPartCounts,
  type Insights,
  MIN_N,
  MIN_PATTERN,
  peakWindow,
  rankInterventions,
  ratio,
  topWeekday,
} from "./analyze";
import { fmtChange, fmtHour, fmtPercent, fmtScore, weekdayName } from "./format";

// Her içgörü ayrı bir kart: başta tek cümlelik bir bulgu, altında onu
// destekleyen sade bir görsel. Kuru bir tablo değil.

function Card({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("animate-fade-up flex flex-col gap-4 rounded-card bg-card p-5 shadow-[0_1px_2px_oklch(0_0_0/0.04)]", className)}>
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Headline({ children }: { children: ReactNode }) {
  return <p className="text-xl leading-snug font-semibold text-balance">{children}</p>;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-muted/70 p-3">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="numeric text-2xl font-bold">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- Özet
export async function SummaryCard({ data }: { data: Insights }) {
  const t = await getTranslations("insights.summary");
  const locale = await getLocale();
  const s = data.totals;

  return (
    <Card title={t("title")}>
      <Headline>{t("urges", { count: s.urges })}</Headline>
      <div className="grid grid-cols-2 gap-2">
        <Stat label={t("avgBefore")} value={fmtScore(s.avg_before, locale)} />
        <Stat
          label={t("pauseRate")}
          value={fmtPercent(ratio(s.paused, s.urges), locale)}
          sub={t("pauseRateSub", { paused: s.paused, urges: s.urges })}
        />
        <Stat
          label={t("avgChange")}
          value={fmtChange(s.avg_change, locale)}
          sub={s.measured > 0 ? t("avgChangeSub", { count: s.measured }) : t("noMeasure")}
        />
        <Stat
          label={t("notDone")}
          value={fmtPercent(ratio(s.not_done, s.with_outcome), locale)}
          sub={s.with_outcome > 0 ? t("notDoneSub", { count: s.with_outcome }) : undefined}
        />
      </div>
      {s.stopped_early > 0 && <p className="text-sm text-muted-foreground">{t("stoppedEarly", { count: s.stopped_early })}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------- Tetikleyiciler
export async function TriggersCard({ data }: { data: Insights }) {
  const t = await getTranslations("insights.triggers");
  const tOpt = await getTranslations("options");
  const locale = await getLocale();
  const urges = data.totals.urges;
  const top = data.triggers[0];
  const label = (o: (typeof data.triggers)[number]) => optionLabel({ ...o, kind: "trigger" }, tOpt);
  const emotion = data.emotions[0];

  return (
    <Card title={t("title")}>
      {!top ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <Headline>{t("headline", { trigger: label(top), pct: fmtPercent(ratio(top.n, urges), locale) })}</Headline>
          {top.avg_before != null && (
            <p className="text-muted-foreground">{t("intensity", { trigger: label(top), avg: fmtScore(top.avg_before, locale) })}</p>
          )}
          <ul className="flex flex-col gap-3">
            {data.triggers.slice(0, 5).map((o) => {
              const share = ratio(o.n, urges) ?? 0;
              return (
                <li key={o.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <OptionIcon option={{ kind: "trigger", key: o.key }} className="size-4 text-muted-foreground" />
                    <span className="flex-1 font-semibold">{label(o)}</span>
                    <span className="numeric text-muted-foreground">{fmtPercent(share, locale)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(share * 100, 3)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {emotion && (
        <p className="border-t border-border pt-3 text-sm">
          {t("emotion", { emotion: optionLabel({ ...emotion, kind: "emotion" }, tOpt) })}
        </p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- Zaman
export async function TimeCard({ data }: { data: Insights }) {
  const t = await getTranslations("insights.time");
  const locale = await getLocale();
  const enough = data.totals.urges >= MIN_PATTERN;
  const peak = enough ? peakWindow(data.hours) : null;
  const day = enough ? topWeekday(data.weekdays) : null;
  const max = Math.max(1, ...data.hours);
  const inPeak = (h: number) => peak != null && (h - peak.start + 24) % 24 < 4;

  return (
    <Card title={t("title")}>
      {peak ? (
        <Headline>{t("headline", { from: fmtHour(peak.start), to: fmtHour(peak.end) })}</Headline>
      ) : (
        <p className="text-muted-foreground">{t("notEnough", { min: MIN_PATTERN })}</p>
      )}

      {/* 24 saatlik dağılım: tek seri, yoğun aralık vurgulu */}
      <figure className="flex flex-col gap-1.5">
        <div className="flex h-24 items-end gap-[2px]" role="img" aria-label={t("chartLabel")}>
          {data.hours.map((count, h) => (
            <div
              key={h}
              title={t("hourCount", { hour: fmtHour(h), count })}
              className={cn(
                "flex-1 rounded-t-[4px]",
                count === 0 ? "bg-muted" : inPeak(h) ? "bg-primary" : "bg-primary/35",
              )}
              style={{ height: count === 0 ? "3px" : `${Math.max((count / max) * 100, 8)}%` }}
            />
          ))}
        </div>
        <div className="numeric flex justify-between text-xs text-muted-foreground" aria-hidden>
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
        <figcaption className="sr-only">
          {data.hours
            .map((count, h) => (count > 0 ? t("hourCount", { hour: fmtHour(h), count }) : null))
            .filter(Boolean)
            .join(", ")}
        </figcaption>
      </figure>

      <ul className="grid grid-cols-4 gap-2 text-center">
        {dayPartCounts(data.hours).map(({ part, count }) => (
          <li key={part} className="flex flex-col gap-0.5 rounded-xl bg-muted/70 px-1 py-2">
            <span className="numeric text-lg font-bold">{count}</span>
            <span className="text-[0.7rem] leading-tight font-semibold text-muted-foreground">{t(`parts.${part}`)}</span>
          </li>
        ))}
      </ul>

      {day && <p className="text-muted-foreground">{t("weekday", { day: weekdayName(day.day, locale) })}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------- Ne işe yarıyor
export async function WorksCard({ data }: { data: Insights }) {
  const t = await getTranslations("insights.works");
  const tOpt = await getTranslations("options");
  const locale = await getLocale();
  const { qualified, others } = rankInterventions(data.interventions);
  const best = qualified[0];
  const label = (o: (typeof data.interventions)[number]) => optionLabel({ ...o, kind: "intervention" }, tOpt);

  return (
    <Card title={t("title")} className="ring-2 ring-primary/15">
      {data.interventions.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          {best && best.avg_change! < 0 ? (
            <Headline>{t("headline", { label: label(best), value: fmtScore(Math.abs(best.avg_change!), locale) })}</Headline>
          ) : (
            <p className="text-muted-foreground">{qualified.length > 0 ? t("noDropYet") : t("explain", { min: MIN_N })}</p>
          )}

          <ul className="flex flex-col divide-y divide-border">
            {[...qualified, ...others].map((o) => {
              const ok = qualified.includes(o);
              return (
                <li key={o.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <OptionIcon option={{ kind: "intervention", key: o.key }} className="size-5" />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="font-semibold">{label(o)}</span>
                    <span className="text-sm text-muted-foreground">{t("uses", { count: o.uses })}</span>
                  </span>
                  {ok ? (
                    <span className="flex flex-col items-end">
                      <span className={cn("numeric text-xl font-bold", o.avg_change! < 0 && "text-change-positive")}>
                        {fmtChange(o.avg_change, locale)}
                      </span>
                      <span className="text-xs text-muted-foreground">{t("points")}</span>
                    </span>
                  ) : (
                    <span className="numeric text-xs font-semibold text-muted-foreground">
                      {t("measuredProgress", { count: o.n, min: MIN_N })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">{t("note")}</p>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- Ne, ne zaman
export async function PairsCard({ data }: { data: Insights }) {
  const t = await getTranslations("insights.pairs");
  const tOpt = await getTranslations("options");
  const locale = await getLocale();
  const pairs = bestPairs(data);

  return (
    <Card title={t("title")}>
      {pairs.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground">{t("locked", { min: MIN_N })}</p>
          {data.pairs.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="numeric text-xs font-semibold text-muted-foreground">
                {t("closest", { count: Math.min(closestPair(data), MIN_N), min: MIN_N })}
              </span>
              <div className="h-2 rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${(Math.min(closestPair(data), MIN_N) / MIN_N) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {pairs.map(({ trigger, intervention, n, avg_change }) => (
            <li key={trigger.id} className="flex flex-col gap-2 rounded-xl bg-muted/70 p-4">
              <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {t("when", { trigger: optionLabel({ ...trigger, kind: "trigger" }, tOpt) })}
              </span>
              <div className="flex items-center gap-3">
                <OptionIcon option={{ kind: "intervention", key: intervention.key }} className="size-5 text-primary" />
                <span className="flex-1 font-semibold">{optionLabel({ ...intervention, kind: "intervention" }, tOpt)}</span>
                <span className="numeric text-xl font-bold text-change-positive">{fmtChange(avg_change, locale)}</span>
              </div>
              <span className="text-xs text-muted-foreground">{t("measured", { count: n })}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
