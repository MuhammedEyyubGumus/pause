// Kişisel araç kutusu: get_toolbox sonucunu okur, araçları sınıflar ve
// dürtü akışındaki alternatif sırasını kişiselleştirir. Saf fonksiyonlar (sunucu + istemci).

import { MIN_N } from "@/features/insights/analyze";

export type Tool = {
  id: string;
  key: string | null;
  label: string | null;
  behavior_id: string | null;
  behavior_template_key: string | null;
  sort_order: number;
  uses: number; // kaç dürtüde denendi
  completed: number;
  n: number; // kaçında yeniden ölçüm var
  avg_change: number | null; // ölçülenlerde ortalama değişim (eksi = düştü)
  dropped: number;
  kept: number; // davranış yapılmadı / farklı seçim
  with_outcome: number;
  last_used: string | null;
  top_trigger_id: string | null;
  top_trigger_n: number | null;
  top_emotion_id: string | null;
  top_emotion_n: number | null;
  pinned: boolean;
  hidden: boolean;
  note: string | null;
};

// "İşe yarıyor" demek için ortalama en az bu kadar düşüş
export const WORKS_DROP = -1;

export type ToolStatus = "works" | "learning" | "new" | "weak";

const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);
const numOrNull = (v: unknown) => (v == null ? null : Number(v));
const strOrNull = (v: unknown) => (v == null ? null : String(v));

export function parseToolbox(raw: unknown): Tool[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    key: strOrNull(r.key),
    label: strOrNull(r.label),
    behavior_id: strOrNull(r.behavior_id),
    behavior_template_key: strOrNull(r.behavior_template_key),
    sort_order: num(r.sort_order),
    uses: num(r.uses),
    completed: num(r.completed),
    n: num(r.n),
    avg_change: numOrNull(r.avg_change),
    dropped: num(r.dropped),
    kept: num(r.kept),
    with_outcome: num(r.with_outcome),
    last_used: strOrNull(r.last_used),
    top_trigger_id: strOrNull(r.top_trigger_id),
    top_trigger_n: numOrNull(r.top_trigger_n),
    top_emotion_id: strOrNull(r.top_emotion_id),
    top_emotion_n: numOrNull(r.top_emotion_n),
    pinned: r.pinned === true,
    hidden: r.hidden === true,
    note: strOrNull(r.note),
  }));
}

export function toolStatus(t: Pick<Tool, "uses" | "n" | "avg_change">): ToolStatus {
  if (t.uses === 0) return "new";
  if (t.n < MIN_N || t.avg_change == null) return "learning";
  return t.avg_change <= WORKS_DROP ? "works" : "weak";
}

// Aynı gruptaki araçların sırası: işe yarayanlar en çok düşürene göre,
// öğrenilenler en çok denenene göre, diğerleri varsayılan sıraya göre.
function compareWithin(a: Tool, b: Tool) {
  const s = toolStatus(a);
  if (s === "works" || s === "weak") {
    return (a.avg_change ?? 0) - (b.avg_change ?? 0) || b.n - a.n || a.sort_order - b.sort_order;
  }
  if (s === "learning") return b.uses - a.uses || a.sort_order - b.sort_order;
  return a.sort_order - b.sort_order;
}

const RANK: Record<ToolStatus, number> = { works: 0, learning: 1, new: 2, weak: 3 };

export function sortTools(tools: Tool[]) {
  return [...tools].sort((a, b) => RANK[toolStatus(a)] - RANK[toolStatus(b)] || compareWithin(a, b));
}

export type ToolboxSections = {
  pinned: Tool[];
  works: Tool[];
  learning: Tool[];
  new: Tool[];
  weak: Tool[];
  hidden: Tool[];
};

export function groupTools(tools: Tool[]): ToolboxSections {
  const out: ToolboxSections = { pinned: [], works: [], learning: [], new: [], weak: [], hidden: [] };
  for (const t of sortTools(tools)) {
    if (t.hidden) out.hidden.push(t);
    else if (t.pinned) out.pinned.push(t);
    else out[toolStatus(t)].push(t);
  }
  return out;
}

// Dürtü akışında alternatifler: sabitlenenler önce, sonra kişisel etkinliğe göre;
// gizlenenler çıkarılır. Araç kutusu yüklenemediyse (çevrimdışı) sıra değişmez.
export function orderForFlow<T extends { id: string; sort_order: number }>(options: T[], tools: Tool[] | null): T[] {
  if (!tools?.length) return options;
  const byId = new Map(tools.map((t) => [t.id, t]));
  const visible = options.filter((o) => !byId.get(o.id)?.hidden);
  const rankOf = (o: T) => {
    const t = byId.get(o.id);
    if (!t) return 2.5; // araç kutusunda henüz yok (ör. yeni eklenen kendi aracı)
    if (t.pinned) return -1;
    return RANK[toolStatus(t)];
  };
  return [...visible].sort((a, b) => {
    const r = rankOf(a) - rankOf(b);
    if (r) return r;
    const ta = byId.get(a.id);
    const tb = byId.get(b.id);
    return ta && tb ? compareWithin(ta, tb) : a.sort_order - b.sort_order;
  });
}

// Davranış yapılmama oranı (en az 3 sonuç varsa göster)
export function keptRatio(t: Pick<Tool, "kept" | "with_outcome">) {
  return t.with_outcome >= 3 ? t.kept / t.with_outcome : null;
}
