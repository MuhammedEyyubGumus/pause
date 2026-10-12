// Kişisel Davranış Haritası (brief bölüm 24): kullanıcının verisinden tek
// bakışta okunan bir özet. Saf fonksiyon; metinler sayfada çevrilir.
// Yorum yalnızca yeterli veri varsa yapılır; yoksa o satır "henüz belli değil" kalır.

import { type Insights, MIN_N, peakWindow, rankInterventions, ratio } from "@/features/insights/analyze";

// Harita bu kadar kayıttan sonra açılır (brief: "yeterli veri sonrası")
export const MAP_MIN_URGES = 10;
// "En fazla geliştiğin alan" için iki dönemin her birinde gereken en az kayıt
const GROWTH_MIN_URGES = 3;

type OptionRef = { id: string; key: string | null; label: string | null };

export type GrowthArea = "pauseRate" | "avgChange" | "stoppedEarly" | "alternatives";

export type BehaviorMap = {
  urges: number;
  trigger: OptionRef | null;
  peak: { start: number; end: number } | null;
  emotion: OptionRef | null;
  avgUrge: number | null;
  alternative: (OptionRef & { avg_change: number; n: number }) | null;
  cutPoint: string | null; // zincir halkası (reflect/chain.tsx CHAIN_STEPS)
  growth: GrowthArea | null;
};

// En sık işaretlenen "zinciri burada kesebilirdim" noktası (en az 2 inceleme)
export function topCutPoint(points: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const p of points) if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length || sorted[0][1] < 2) return null;
  if (sorted[1] && sorted[1][1] === sorted[0][1]) return null; // eşitlikte yorum yok
  return sorted[0][0];
}

// Son 30 gün ile önceki 30 gün: en çok ilerlenen alan. "Daha az dürtü" bir ilerleme ölçüsü değildir (bölüm 27).
export function growthArea(recent: Insights, previous: Insights): GrowthArea | null {
  const r = recent.totals;
  const p = previous.totals;
  if (r.urges < GROWTH_MIN_URGES || p.urges < GROWTH_MIN_URGES) return null;

  const uses = (d: Insights) => d.interventions.reduce((s, i) => s + i.uses, 0);
  const earlyRate = (t: Insights["totals"]) => ratio(t.stopped_early, t.stopped_early + t.occurred);

  const scores: [GrowthArea, number][] = [];
  scores.push(["pauseRate", (ratio(r.paused, r.urges) ?? 0) - (ratio(p.paused, p.urges) ?? 0) - 0.1]);
  if (r.avg_change != null && p.avg_change != null && r.measured >= 2 && p.measured >= 2) {
    scores.push(["avgChange", (p.avg_change - r.avg_change) / 5 - 0.1]);
  }
  const er = earlyRate(r);
  const ep = earlyRate(p);
  if (er != null && ep != null) scores.push(["stoppedEarly", er - ep - 0.15]);
  scores.push(["alternatives", (uses(recent) / r.urges - uses(previous) / p.urges) / 2 - 0.1]);

  const best = scores.filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

export function buildMap(all: Insights, recent: Insights, previous: Insights, cutPoints: (string | null)[]): BehaviorMap {
  const best = rankInterventions(all.interventions).qualified.find((i) => (i.avg_change ?? 0) < 0);
  const peak = all.totals.urges >= 5 ? peakWindow(all.hours) : null;
  return {
    urges: all.totals.urges,
    trigger: all.triggers[0] ?? null,
    peak: peak ? { start: peak.start, end: peak.end } : null,
    emotion: all.emotions[0] ?? null,
    avgUrge: all.totals.avg_before,
    alternative: best && best.avg_change != null ? { ...best, avg_change: best.avg_change, n: best.n } : null,
    cutPoint: topCutPoint(cutPoints),
    growth: growthArea(recent, previous),
  };
}

export { MIN_N };
