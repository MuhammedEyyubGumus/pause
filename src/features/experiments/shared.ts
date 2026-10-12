// Haftalık deney (brief bölüm 26): sunucu ve istemcide ortak tipler ve yardımcılar.

export type Experiment = {
  id: string;
  behavior_id: string | null;
  trigger_option_id: string | null;
  intervention_option_id: string;
  min_urge: number;
  starts_on: string;
  ends_on: string;
  status: "active" | "completed" | "abandoned";
};

export type ExperimentResults = {
  opportunities: number;
  applied: number;
  applied_measured: number;
  applied_avg: number | null;
  other_measured: number;
  other_avg: number | null;
};

export const EXPERIMENT_COLUMNS =
  "id, behavior_id, trigger_option_id, intervention_option_id, min_urge, starts_on, ends_on, status" as const;

// Eşik seçenekleri: her dürtü / orta ve üstü / güçlü
export const THRESHOLDS = [0, 5, 7] as const;

const n = (v: unknown) => (v == null ? 0 : Number(v) || 0);
const nOrNull = (v: unknown) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));

export function parseResults(raw: unknown): ExperimentResults {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    opportunities: n(r.opportunities),
    applied: n(r.applied),
    applied_measured: n(r.applied_measured),
    applied_avg: nOrNull(r.applied_avg),
    other_measured: n(r.other_measured),
    other_avg: nOrNull(r.other_avg),
  };
}

// Kalan gün (bugün dahil). Bitmişse 0.
export function daysLeft(endsOn: string, today: string) {
  const ms = Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000) + 1);
}

export const isFinished = (x: Pick<Experiment, "ends_on">, today: string) => x.ends_on < today;

// Bu dürtü deneyin kuralına uyuyor mu? (dürtü akışında öneri için)
export function matchesExperiment(
  x: Pick<Experiment, "behavior_id" | "trigger_option_id" | "min_urge">,
  ev: { behaviorId: string | null | undefined; triggerIds: string[]; urgeBefore: number | null | undefined },
) {
  if (x.behavior_id && x.behavior_id !== ev.behaviorId) return false;
  if (x.trigger_option_id && !ev.triggerIds.includes(x.trigger_option_id)) return false;
  if (x.min_urge > 0 && (ev.urgeBefore == null || ev.urgeBefore < x.min_urge)) return false;
  return true;
}
