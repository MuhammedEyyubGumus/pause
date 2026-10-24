// "Pattern'lerimi analiz et" (brief bölüm 29): sunucu sayıları hesaplar, yapay zekâ yalnızca yorumlar.
// Bu dosya saf fonksiyonlar içerir:
//   buildFacts      — get_insights sonucundan, biçimlenmiş özet sayılar (yapay zekâya giden tek veri)
//   numbersIn / onlyKnownNumbers — yorumda olgularda olmayan bir sayı var mı?
//   factLines       — aynı olguların düz cümle hali (yedek metin ve "dayandığı sayılar" listesi)
// Gizlilik: kullanıcının kendi yazdığı etiketler (özel tetikleyici, özel davranış adı) gönderilmez.

import { fmtChange, fmtHour, fmtPercent, fmtScore, weekdayName } from "@/features/insights/format";
import {
  bestPairs,
  type Insights,
  MIN_N,
  peakWindow,
  type Period,
  rankInterventions,
  ratio,
  topWeekday,
} from "@/features/insights/analyze";

// Analiz için dönemde gereken en az kayıt
export const ANALYZE_MIN_URGES = 10;
// Kullanıcı başına 24 saatte en fazla yapay zekâ çağrısı
export const DAILY_AI_LIMIT = 5;

type Ref = { key: string | null; label: string | null };

export type Facts = {
  period: Period;
  behavior: string | null;
  urges: number;
  avg_intensity: string | null;
  paused: number;
  paused_share: string | null;
  measured: number;
  avg_change: string | null;
  dropped: number;
  outcomes: { known: number; not_done: number; stopped_early: number; occurred: number; not_done_share: string | null };
  triggers: { name: string; count: number; share: string; avg_intensity: string | null }[];
  emotions: { name: string; count: number; share: string }[];
  peak_hours: string | null;
  peak_count: number | null;
  busiest_day: string | null;
  effective_alternatives: { name: string; measured: number; avg_change: string }[];
  learning_alternatives: { name: string; uses: number; measured: number }[];
  best_pairs: { trigger: string; alternative: string; measured: number; avg_change: string }[];
  min_measurements: number;
};

export type Labeler = (kind: "trigger" | "emotion" | "intervention", ref: Ref) => string;

export function buildFacts(
  data: Insights,
  opts: { period: Period; behavior: string | null; locale: string; label: Labeler },
): Facts {
  const { locale, label } = opts;
  const t = data.totals;
  const pct = (part: number, whole: number) => fmtPercent(ratio(part, whole), locale);
  const known = t.not_done + t.stopped_early + t.occurred;
  const peak = peakWindow(data.hours);
  const day = topWeekday(data.weekdays);
  const { qualified, others } = rankInterventions(data.interventions);

  return {
    period: opts.period,
    behavior: opts.behavior,
    urges: t.urges,
    avg_intensity: t.avg_before != null ? fmtScore(t.avg_before, locale) : null,
    paused: t.paused,
    paused_share: t.urges ? pct(t.paused, t.urges) : null,
    measured: t.measured,
    avg_change: t.measured ? fmtChange(t.avg_change, locale) : null,
    dropped: t.dropped,
    outcomes: {
      known,
      not_done: t.not_done,
      stopped_early: t.stopped_early,
      occurred: t.occurred,
      not_done_share: known ? pct(t.not_done, known) : null,
    },
    triggers: data.triggers
      .filter((x) => x.n >= 2)
      .slice(0, 3)
      .map((x) => ({
        name: label("trigger", x),
        count: x.n,
        share: pct(x.n, t.urges),
        avg_intensity: x.avg_before != null ? fmtScore(x.avg_before, locale) : null,
      })),
    emotions: data.emotions
      .filter((x) => x.n >= 2)
      .slice(0, 3)
      .map((x) => ({ name: label("emotion", x), count: x.n, share: pct(x.n, t.urges) })),
    peak_hours: peak && t.urges >= 5 ? `${fmtHour(peak.start)}–${fmtHour(peak.end)}` : null,
    peak_count: peak && t.urges >= 5 ? peak.count : null,
    busiest_day: day && day.count >= 3 ? weekdayName(day.day, locale) : null,
    effective_alternatives: qualified.slice(0, 3).map((x) => ({
      name: label("intervention", x),
      measured: x.n,
      avg_change: fmtChange(x.avg_change, locale),
    })),
    learning_alternatives: others
      .filter((x) => x.uses > 0)
      .slice(0, 3)
      .map((x) => ({ name: label("intervention", x), uses: x.uses, measured: x.n })),
    best_pairs: bestPairs(data, 2).map((p) => ({
      trigger: label("trigger", p.trigger),
      alternative: label("intervention", p.intervention),
      measured: p.n,
      avg_change: fmtChange(p.avg_change, locale),
    })),
    min_measurements: MIN_N,
  };
}

// ---------------------------------------------------------------------
// Sayı denetimi: yorumdaki her sayı olgularda geçmeli
// ---------------------------------------------------------------------
const NUMBER = /\d+(?:[.,]\d+)?/g;
const normalize = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? String(n) : s;
};

export function numbersIn(text: string): string[] {
  return (text.match(NUMBER) ?? []).map(normalize);
}

// Olgulardaki tüm sayılar + ölçeğin uçları (0–10)
export function allowedNumbers(facts: Facts): Set<string> {
  const set = new Set(numbersIn(JSON.stringify({ ...facts, period: facts.period === "all" ? null : facts.period })));
  set.add("0");
  set.add("10");
  return set;
}

export function unknownNumbers(text: string, facts: Facts): string[] {
  const allowed = allowedNumbers(facts);
  return numbersIn(text).filter((n) => !allowed.has(n));
}

// ---------------------------------------------------------------------
// Düz cümle hali (yapay zekâ yokken ya da yorum reddedildiğinde)
// ---------------------------------------------------------------------
type T = (key: string, values?: Record<string, string | number>) => string;

export function factLines(f: Facts, t: T): string[] {
  const lines: string[] = [];
  lines.push(
    f.avg_intensity
      ? t("urgesWithAvg", { count: f.urges, avg: f.avg_intensity })
      : t("urges", { count: f.urges }),
  );
  if (f.triggers[0]) {
    const top = f.triggers[0];
    lines.push(
      top.avg_intensity
        ? t("topTriggerWithAvg", { name: top.name, share: top.share, avg: top.avg_intensity })
        : t("topTrigger", { name: top.name, share: top.share }),
    );
  }
  if (f.emotions[0]) lines.push(t("topEmotion", { name: f.emotions[0].name, share: f.emotions[0].share }));
  if (f.peak_hours) lines.push(t("peak", { hours: f.peak_hours }));
  if (f.busiest_day) lines.push(t("busiestDay", { day: f.busiest_day }));
  if (f.paused_share) lines.push(t("paused", { count: f.paused, share: f.paused_share }));
  if (f.avg_change && f.measured >= 3) lines.push(t("change", { count: f.measured, change: f.avg_change }));
  if (f.outcomes.not_done_share) lines.push(t("notDone", { count: f.outcomes.not_done, share: f.outcomes.not_done_share }));
  for (const a of f.effective_alternatives.slice(0, 2)) {
    lines.push(t("effective", { name: a.name, count: a.measured, change: a.avg_change }));
  }
  if (f.best_pairs[0]) {
    const p = f.best_pairs[0];
    lines.push(t("pair", { trigger: p.trigger, alternative: p.alternative, change: p.avg_change }));
  }
  if (!f.effective_alternatives.length && f.learning_alternatives[0]) {
    const a = f.learning_alternatives[0];
    lines.push(t("learning", { name: a.name, count: a.measured, min: f.min_measurements }));
  }
  return lines;
}

// Yedek metnin son cümlesi: bir sonraki hafta için küçük bir deney önerisi
export function templateSuggestion(f: Facts, t: T): string {
  if (f.best_pairs[0]) return t("suggestPair", { trigger: f.best_pairs[0].trigger, alternative: f.best_pairs[0].alternative });
  if (f.effective_alternatives[0] && f.triggers[0]) {
    return t("suggestPair", { trigger: f.triggers[0].name, alternative: f.effective_alternatives[0].name });
  }
  if (f.learning_alternatives[0]) return t("suggestLearning", { name: f.learning_alternatives[0].name });
  if (f.peak_hours) return t("suggestPeak", { hours: f.peak_hours });
  return t("suggestDefault");
}
