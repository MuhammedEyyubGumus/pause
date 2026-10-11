// İçgörü ekranının saf hesapları. Veritabanı yalnızca sayıları verir
// (get_insights); "en iyi", "en riskli" gibi yorumlar burada ve yalnızca
// yeterli veri varsa yapılır.

import type { DayPart } from "@/lib/time/local";

// Bir alternatif / eşleşme hakkında yorum yapmak için gereken en az ölçüm (brief: n ≥ 5)
export const MIN_N = 5;
// Saat ve gün örüntüsü için gereken en az kayıt
export const MIN_PATTERN = 5;

export const PERIODS = ["7", "30", "90", "all"] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = "30";

export function parsePeriod(v: string | undefined): Period {
  return (PERIODS as readonly string[]).includes(v ?? "") ? (v as Period) : DEFAULT_PERIOD;
}

// Dönemin ilk günü (kullanıcının yerel "bugün"ünden geriye; bugün dahil)
export function periodStart(today: string, period: Period): string | null {
  if (period === "all") return null;
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (Number(period) - 1));
  return d.toISOString().slice(0, 10);
}

type OptionRef = { id: string; key: string | null; label: string | null };

export type Insights = {
  totals: {
    urges: number;
    avg_before: number | null;
    paused: number;
    pause_completed: number;
    measured: number;
    avg_change: number | null;
    dropped: number;
    with_outcome: number;
    not_done: number;
    stopped_early: number;
    occurred: number;
    emergency: number;
  };
  hours: number[]; // 24
  weekdays: number[]; // 7, ISO sırası (Pzt..Paz)
  triggers: (OptionRef & { n: number; avg_before: number | null })[];
  emotions: (OptionRef & { n: number })[];
  interventions: (OptionRef & { uses: number; n: number; avg_change: number | null })[];
  pairs: { trigger_id: string; intervention_id: string; n: number; avg_change: number }[];
};

const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v ?? NaN) || fallback);
const numOrNull = (v: unknown) => (v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
const ref = (o: Record<string, unknown>): OptionRef => ({
  id: String(o.id),
  key: (o.key as string | null) ?? null,
  label: (o.label as string | null) ?? null,
});

// RPC sonucu Json tipinde gelir; beklenmeyen bir şey olsa da ekran çökmesin.
export function parseInsights(raw: unknown): Insights {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const t = (r.totals && typeof r.totals === "object" ? r.totals : {}) as Record<string, unknown>;
  const fixed = (v: unknown, len: number) => Array.from({ length: len }, (_, i) => num(Array.isArray(v) ? v[i] : 0));
  return {
    totals: {
      urges: num(t.urges),
      avg_before: numOrNull(t.avg_before),
      paused: num(t.paused),
      pause_completed: num(t.pause_completed),
      measured: num(t.measured),
      avg_change: numOrNull(t.avg_change),
      dropped: num(t.dropped),
      with_outcome: num(t.with_outcome),
      not_done: num(t.not_done),
      stopped_early: num(t.stopped_early),
      occurred: num(t.occurred),
      emergency: num(t.emergency),
    },
    hours: fixed(r.hours, 24),
    weekdays: fixed(r.weekdays, 7),
    triggers: arr(r.triggers).map((o) => ({ ...ref(o), n: num(o.n), avg_before: numOrNull(o.avg_before) })),
    emotions: arr(r.emotions).map((o) => ({ ...ref(o), n: num(o.n) })),
    interventions: arr(r.interventions).map((o) => ({
      ...ref(o),
      uses: num(o.uses),
      n: num(o.n),
      avg_change: numOrNull(o.avg_change),
    })),
    pairs: arr(r.pairs).map((p) => ({
      trigger_id: String(p.trigger_id),
      intervention_id: String(p.intervention_id),
      n: num(p.n),
      avg_change: num(p.avg_change),
    })),
  };
}

// En yoğun ardışık saat aralığı (gece yarısını aşabilir, ör. 22:00–02:00).
// Eşitlikte daha erken başlayan seçilir. Hiç kayıt yoksa null.
export function peakWindow(hours: number[], width = 4): { start: number; end: number; count: number } | null {
  let best = { start: 0, count: -1 };
  for (let s = 0; s < 24; s++) {
    let c = 0;
    for (let k = 0; k < width; k++) c += hours[(s + k) % 24] ?? 0;
    if (c > best.count) best = { start: s, count: c };
  }
  if (best.count <= 0) return null;
  return { start: best.start, end: (best.start + width) % 24, count: best.count };
}

// Brief'teki gün dilimleri (lib/time/local.ts > dayPart ile aynı sınırlar)
export const DAY_PARTS: { part: DayPart; hours: number[] }[] = [
  { part: "morning", hours: [5, 6, 7, 8, 9, 10, 11] },
  { part: "afternoon", hours: [12, 13, 14, 15, 16] },
  { part: "evening", hours: [17, 18, 19, 20, 21] },
  { part: "night", hours: [22, 23, 0, 1, 2, 3, 4] },
];

export function dayPartCounts(hours: number[]) {
  return DAY_PARTS.map(({ part, hours: hs }) => ({ part, count: hs.reduce((s, h) => s + (hours[h] ?? 0), 0) }));
}

// Açık ara en yoğun gün (ISO 1–7). Birden fazla gün eşitse yorum yapılmaz.
export function topWeekday(weekdays: number[]): { day: number; count: number } | null {
  const max = Math.max(...weekdays);
  if (max <= 0) return null;
  const days = weekdays.flatMap((c, i) => (c === max ? [i + 1] : []));
  return days.length === 1 ? { day: days[0], count: max } : null;
}

// Alternatifler: yeterli ölçümü olanlar etkiye göre (en çok düşüren önce),
// diğerleri kullanım sayısına göre.
export function rankInterventions(list: Insights["interventions"]) {
  const qualified = list
    .filter((i) => i.n >= MIN_N && i.avg_change != null)
    .sort((a, b) => a.avg_change! - b.avg_change! || b.n - a.n);
  const others = list.filter((i) => !qualified.includes(i)).sort((a, b) => b.uses - a.uses || b.n - a.n);
  return { qualified, others };
}

// Her tetikleyici için yeterli veriye sahip en etkili alternatif (yalnızca düşüş varsa).
// Tetikleyiciler en sık görülenden başlayarak sıralanır.
export function bestPairs(data: Insights, limit = 3) {
  const out: { trigger: Insights["triggers"][number]; intervention: Insights["interventions"][number]; n: number; avg_change: number }[] = [];
  for (const trigger of data.triggers) {
    const best = data.pairs
      .filter((p) => p.trigger_id === trigger.id && p.n >= MIN_N && p.avg_change < 0)
      .sort((a, b) => a.avg_change - b.avg_change || b.n - a.n)[0];
    const intervention = best && data.interventions.find((i) => i.id === best.intervention_id);
    if (best && intervention) out.push({ trigger, intervention, n: best.n, avg_change: best.avg_change });
    if (out.length >= limit) break;
  }
  return out;
}

// Henüz açılmamış eşleşmeler için ilerleme: en çok ölçümü olan eşleşme
export function closestPair(data: Insights) {
  return data.pairs.reduce((m, p) => Math.max(m, p.n), 0);
}

export const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);
