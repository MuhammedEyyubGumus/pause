// "Yolun" (brief bölüm 36, PATH): get_timeline sonucunu okur ve yolun yerleşimini hesaplar.
// Saf fonksiyonlar; sunucu ve istemci ortak kullanır.

export type StepKind = "kept" | "stopped" | "occurred" | "open";

export type TimelineEvent = {
  id: string;
  at: string;
  date: string;
  kind: StepKind;
  paused: boolean;
  change: number | null;
  newTools: string[];
};

export type TimelineWeek = {
  start: string;
  urges: number;
  avgBefore: number | null;
  avgAfter: number | null;
  kept: number;
  stopped: number;
  occurred: number;
};

export type Timeline = {
  total: number;
  events: TimelineEvent[]; // eskiden yeniye
  weeks: TimelineWeek[]; // eskiden yeniye
  heat: number[][]; // [gün 0=Pzt..6=Paz][saat 0..23]
};

const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);
const numOrNull = (v: unknown) => (v == null ? null : Number(v));

export function stepKind(outcome: unknown): StepKind {
  if (outcome === "not_done" || outcome === "alternative") return "kept";
  if (outcome === "stopped_early") return "stopped";
  if (outcome === "occurred") return "occurred";
  return "open";
}

export function parseTimeline(raw: unknown): Timeline {
  const r = (raw ?? {}) as Record<string, unknown>;
  const events = Array.isArray(r.events) ? r.events : [];
  const weeks = Array.isArray(r.weeks) ? r.weeks : [];
  const heat = Array.isArray(r.heat) ? r.heat : [];
  return {
    total: num(r.total),
    events: events.map((e: Record<string, unknown>) => ({
      id: String(e.id),
      at: String(e.at),
      date: String(e.date),
      kind: stepKind(e.outcome),
      paused: e.paused === true,
      change: numOrNull(e.change),
      newTools: Array.isArray(e.new_tools) ? e.new_tools.map(String) : [],
    })),
    weeks: weeks.map((w: Record<string, unknown>) => ({
      start: String(w.start),
      urges: num(w.urges),
      avgBefore: numOrNull(w.avg_before),
      avgAfter: numOrNull(w.avg_after),
      kept: num(w.kept),
      stopped: num(w.stopped),
      occurred: num(w.occurred),
    })),
    heat: Array.from({ length: 7 }, (_, d) =>
      Array.from({ length: 24 }, (_, h) => num((heat[d] as unknown[] | undefined)?.[h])),
    ),
  };
}

// ---------------------------------------------------------------------
// Yol yerleşimi: kıvrılan bir yol, en eski adım altta, en yeni üstte.
// Her satırda COLS adım; satır sonlarında yol U çizerek bir üst satıra döner.
// ---------------------------------------------------------------------
export const PATH_WIDTH = 320;
const COLS = 7;
const MARGIN_X = 34;
const MARGIN_Y = 30;
const ROW_H = 52;

export type PathPoint = { x: number; y: number; event: TimelineEvent };

export function layoutPath(events: TimelineEvent[]) {
  const rows = Math.max(1, Math.ceil(events.length / COLS));
  const height = MARGIN_Y * 2 + (rows - 1) * ROW_H;
  const step = (PATH_WIDTH - MARGIN_X * 2) / (COLS - 1);

  const points: PathPoint[] = events.map((event, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const leftToRight = row % 2 === 0;
    const x = MARGIN_X + (leftToRight ? col : COLS - 1 - col) * step;
    const y = height - MARGIN_Y - row * ROW_H;
    return { x: round(x), y: round(y), event };
  });

  // Aynı satırda düz çizgi; satır değişiminde dışa doğru kıvrılan bir eğri
  let d = "";
  points.forEach((p, i) => {
    if (i === 0) {
      d = `M${p.x} ${p.y}`;
      return;
    }
    const prev = points[i - 1];
    if (prev.y === p.y) {
      d += ` L${p.x} ${p.y}`;
    } else {
      const out = p.x < PATH_WIDTH / 2 ? -26 : 26;
      d += ` C${round(prev.x + out)} ${prev.y} ${round(p.x + out)} ${p.y} ${p.x} ${p.y}`;
    }
  });

  return { points, d, height, width: PATH_WIDTH };
}

function round(v: number) {
  return Math.round(v * 10) / 10;
}

export function pathSummary(events: TimelineEvent[]) {
  return {
    kept: events.filter((e) => e.kind === "kept").length,
    stopped: events.filter((e) => e.kind === "stopped").length,
    paused: events.filter((e) => e.paused).length,
    tools: events.reduce((s, e) => s + e.newTools.length, 0),
  };
}

// ---------------------------------------------------------------------
// Haftalık eğilim: 0–10 ölçeğinde önce/sonra çizgileri (boş haftalarda kopar)
// ---------------------------------------------------------------------
export function trendSegments(values: (number | null)[], x: (i: number) => number, y: (v: number) => number) {
  const segments: string[] = [];
  let current = "";
  values.forEach((v, i) => {
    if (v == null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    current += `${current ? " L" : "M"}${round(x(i))} ${round(y(v))}`;
  });
  if (current) segments.push(current);
  return segments;
}

export const TREND_MIN_WEEKS = 2;
export const HEAT_MIN_URGES = 10;

export function weeksWithData(weeks: TimelineWeek[]) {
  return weeks.filter((w) => w.urges > 0).length;
}

export function heatMax(heat: number[][]) {
  return Math.max(0, ...heat.flat());
}
