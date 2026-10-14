// Tasarruf ve dersler: veritabanındaki get_savings sonucunu okur ve toplar.

export type SavingsRow = {
  behavior_id: string;
  cost_amount: number | null;
  cost_currency: string;
  urges: number;
  not_done: number;
  stopped_early: number;
  occurred: number;
  open: number;
  saved: number | null;
};

const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);

export function parseSavings(raw: unknown): SavingsRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: Record<string, unknown>) => ({
    behavior_id: String(r.behavior_id),
    cost_amount: r.cost_amount == null ? null : Number(r.cost_amount),
    cost_currency: String(r.cost_currency ?? "TRY"),
    urges: num(r.urges),
    not_done: num(r.not_done),
    stopped_early: num(r.stopped_early),
    occurred: num(r.occurred),
    open: num(r.open),
    saved: r.saved == null ? null : Number(r.saved),
  }));
}

// Sayıları topla; tasarruf para birimine göre ayrı tutulur (TL ile euro toplanmaz)
export function totals(rows: SavingsRow[]) {
  const byCurrency = new Map<string, number>();
  for (const r of rows) {
    if (r.saved != null) byCurrency.set(r.cost_currency, (byCurrency.get(r.cost_currency) ?? 0) + r.saved);
  }
  return {
    urges: rows.reduce((s, r) => s + r.urges, 0),
    not_done: rows.reduce((s, r) => s + r.not_done, 0),
    stopped_early: rows.reduce((s, r) => s + r.stopped_early, 0),
    occurred: rows.reduce((s, r) => s + r.occurred, 0),
    open: rows.reduce((s, r) => s + r.open, 0),
    saved: [...byCurrency.entries()].map(([currency, amount]) => ({ currency, amount })),
    anyCost: rows.some((r) => r.cost_amount != null),
  };
}

export function fmtMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
