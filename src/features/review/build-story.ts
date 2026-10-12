// Haftalık hikâye (brief bölüm 25): bir haftanın sayılarından sayfa sayfa
// anlatılacak bulguları seçer. Saf fonksiyon; metinler sayfada çevrilir.
// İlke (bölüm 27): ilerleme "daha az dürtü" ya da seri üzerinden değil;
// daha fazla pause, daha fazla alternatif, daha erken durma üzerinden anlatılır.

import { bestPairs, type Insights, MIN_N, rankInterventions, ratio, topWeekday } from "@/features/insights/analyze";

type OptionRef = { id: string; key: string | null; label: string | null };

export type Story =
  | { kind: "count"; urges: number; perDay: number[] }
  | { kind: "hardestDay"; day: number; count: number }
  | { kind: "trigger"; trigger: OptionRef; share: number }
  | { kind: "paused"; paused: number; urges: number }
  | { kind: "worked"; intervention: OptionRef; n: number; avgChange: number }
  | { kind: "progress"; metric: ProgressMetric; now: number; before: number }
  | { kind: "experiment"; trigger: OptionRef | null; intervention: OptionRef | null };

export type ProgressMetric = "pauseRate" | "avgChange" | "alternatives" | "stoppedEarly";

// Bir hafta içinde ortalama değişimden söz etmek için en az ölçüm.
// "En iyi" iddiası yok; yalnızca o haftada ne gözlendiği anlatılır.
const MIN_WEEK_MEASURED = 2;

const uses = (d: Insights) => d.interventions.reduce((s, i) => s + i.uses, 0);

export function pickProgress(week: Insights, prev: Insights): Story | null {
  if (prev.totals.urges === 0 || week.totals.urges === 0) return null;

  const rateNow = ratio(week.totals.paused, week.totals.urges) ?? 0;
  const rateBefore = ratio(prev.totals.paused, prev.totals.urges) ?? 0;
  if (rateNow - rateBefore >= 0.1) return { kind: "progress", metric: "pauseRate", now: rateNow, before: rateBefore };

  const a = week.totals.avg_change;
  const b = prev.totals.avg_change;
  if (a != null && b != null && week.totals.measured >= MIN_WEEK_MEASURED && b - a >= 0.5) {
    return { kind: "progress", metric: "avgChange", now: a, before: b };
  }

  if (uses(week) > uses(prev)) return { kind: "progress", metric: "alternatives", now: uses(week), before: uses(prev) };

  if (week.totals.stopped_early > prev.totals.stopped_early) {
    return { kind: "progress", metric: "stoppedEarly", now: week.totals.stopped_early, before: prev.totals.stopped_early };
  }
  return null;
}

// Gelecek haftanın deneyi (bölüm 26): önce kişisel kanıt, yoksa haftanın en sık
// tetikleyicisi ile en çok denenen alternatif, o da yoksa yalnızca pause.
export function pickExperiment(week: Insights, allTime: Insights): Story {
  const pair = bestPairs(allTime, 1)[0];
  if (pair) return { kind: "experiment", trigger: pair.trigger, intervention: pair.intervention };

  const trigger = week.triggers[0] ?? allTime.triggers[0] ?? null;
  const proven = rankInterventions(allTime.interventions).qualified.find((i) => (i.avg_change ?? 0) < 0);
  const mostUsed = [...week.interventions].sort((x, y) => y.uses - x.uses)[0] ?? null;
  return { kind: "experiment", trigger, intervention: proven ?? mostUsed ?? null };
}

export function buildStory(week: Insights, prev: Insights, allTime: Insights): Story[] {
  const t = week.totals;
  const stories: Story[] = [{ kind: "count", urges: t.urges, perDay: week.weekdays }];
  if (t.urges === 0) return [...stories, pickExperiment(week, allTime)];

  const day = topWeekday(week.weekdays);
  if (day && t.urges >= 3) stories.push({ kind: "hardestDay", day: day.day, count: day.count });

  const top = week.triggers[0];
  if (top) stories.push({ kind: "trigger", trigger: top, share: top.n / t.urges });

  stories.push({ kind: "paused", paused: t.paused, urges: t.urges });

  const worked = week.interventions
    .filter((i) => i.n >= MIN_WEEK_MEASURED && i.avg_change != null && i.avg_change < 0)
    .sort((x, y) => x.avg_change! - y.avg_change! || y.n - x.n)[0];
  if (worked) stories.push({ kind: "worked", intervention: worked, n: worked.n, avgChange: worked.avg_change! });

  const progress = pickProgress(week, prev);
  if (progress) stories.push(progress);

  stories.push(pickExperiment(week, allTime));
  return stories;
}

// Haftanın pazartesi günü (YYYY-MM-DD, ISO hafta)
export function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const wd = d.getUTCDay() || 7; // 1 = Pzt .. 7 = Paz
  d.setUTCDate(d.getUTCDate() - (wd - 1));
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export { MIN_N };
