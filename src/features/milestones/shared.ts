// Öğrenme kilometre taşları (brief bölüm 28). Sıra: yolculuğun doğal akışı.
export const MILESTONES = [
  "first_urge",
  "first_pause",
  "first_alternative",
  "first_stopped_early",
  "ten_events",
  "first_review",
  "first_pattern",
  "first_experiment",
] as const;

export type MilestoneKey = (typeof MILESTONES)[number];
export type MilestoneState = { key: MilestoneKey; achievedAt: string | null };

export function parseMilestones(raw: unknown): MilestoneState[] {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return MILESTONES.map((key) => ({ key, achievedAt: typeof r[key] === "string" ? (r[key] as string) : null }));
}

// Kutlanmamış yeni taşlar, en yenisi önce
export function newMilestones(states: MilestoneState[], celebrated: string[] | null | undefined) {
  const seen = new Set(celebrated ?? []);
  return states
    .filter((s) => s.achievedAt && !seen.has(s.key))
    .sort((a, b) => Date.parse(b.achievedAt!) - Date.parse(a.achievedAt!));
}
