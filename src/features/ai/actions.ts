"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";

import { isTemplateKey } from "@/features/behaviors/templates";
import { parseInsights, parsePeriod, periodStart } from "@/features/insights/analyze";
import { requireOnboardedUser } from "@/lib/auth";
import { localParts } from "@/lib/time/local";
import type { Json } from "@/types/database";

import { interpretFacts } from "./claude";
import { ANALYZE_MIN_URGES, buildFacts, DAILY_AI_LIMIT, factLines, type Labeler, templateSuggestion } from "./facts";

export type AnalysisResult =
  | { ok: true; body: string; source: "ai" | "template"; createdAt: string; lines: string[]; limited: boolean }
  | { ok: false; error: "consent" | "notEnough" | "failed" };

// Yapay zekâ yorumuna izin ver / geri çek. Geri çekilince önceki yorumlar da silinir.
export async function setAiConsent(enabled: boolean) {
  const { supabase, user } = await requireOnboardedUser();
  await supabase
    .from("profiles")
    .update({ ai_consent_at: enabled ? new Date().toISOString() : null })
    .eq("id", user.id);
  if (!enabled) await supabase.from("ai_analyses").delete().eq("user_id", user.id);
  revalidatePath("/analyze");
  revalidatePath("/settings");
}

// Anahtarları sıralı JSON: veritabanı jsonb anahtar sırasını değiştirdiği için karşılaştırmada kullanılır
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

export async function runAnalysis(input: { period: string; behaviorId: string | null }): Promise<AnalysisResult> {
  const { supabase, user, profile } = await requireOnboardedUser();
  if (!profile.ai_consent_at) return { ok: false, error: "consent" };

  const locale = await getLocale();
  const tOpt = await getTranslations("options");
  const tb = await getTranslations("behaviors");
  const ta = await getTranslations("analyze");
  const tf = await getTranslations("analyze.facts");

  const period = parsePeriod(input.period);
  const today = localParts(new Date(), profile.timezone).date;

  // Davranış filtresi yalnızca kullanıcının kendi davranışıysa
  let behavior: { id: string; name: string; template_key: string | null } | null = null;
  if (input.behaviorId) {
    const { data } = await supabase
      .from("behaviors")
      .select("id, name, template_key")
      .eq("id", input.behaviorId)
      .maybeSingle();
    behavior = data ?? null;
  }

  const { data: raw, error } = await supabase.rpc("get_insights", {
    ...(periodStart(today, period) ? { p_from: periodStart(today, period)! } : {}),
    ...(behavior ? { p_behavior: behavior.id } : {}),
  });
  if (error) return { ok: false, error: "failed" };
  const insights = parseInsights(raw);
  if (insights.totals.urges < ANALYZE_MIN_URGES) return { ok: false, error: "notEnough" };

  // Kullanıcının kendi yazdığı etiketler yerine genel bir ifade gönderilir
  const label: Labeler = (kind, ref) => (ref.key ? tOpt(`${kind}.${ref.key}`) : ta(`custom.${kind}`));
  const facts = buildFacts(insights, {
    period,
    locale,
    label,
    behavior: behavior ? (isTemplateKey(behavior.template_key) ? tb(behavior.template_key) : ta("custom.behavior")) : null,
  });
  const lines = factLines(facts, tf);

  // Aynı sayılar için yeniden yorum üretme (maliyet ve tutarlılık)
  let previous = supabase
    .from("ai_analyses")
    .select("body, source, created_at, facts")
    .eq("period", period)
    .order("created_at", { ascending: false })
    .limit(1);
  previous = behavior ? previous.eq("behavior_id", behavior.id) : previous.is("behavior_id", null);
  const { data: last } = await previous.maybeSingle();
  if (last && stable(last.facts) === stable(facts) && last.source === "ai") {
    return { ok: true, body: last.body, source: "ai", createdAt: last.created_at, lines, limited: false };
  }

  // Günlük sınır: aşılırsa yapay zekâ çağrılmaz, yedek metin kullanılır
  const { count } = await supabase
    .from("ai_analyses")
    .select("id", { count: "exact", head: true })
    .eq("source", "ai")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const limited = (count ?? 0) >= DAILY_AI_LIMIT;

  const ai = limited ? null : await interpretFacts(facts, locale);
  const body = ai?.text ?? [lines.join(" "), templateSuggestion(facts, tf)].join("\n\n");
  const source = ai ? "ai" : "template";

  const { data: saved, error: insertError } = await supabase
    .from("ai_analyses")
    .insert({
      user_id: user.id,
      period,
      behavior_id: behavior?.id ?? null,
      facts: facts as unknown as Json,
      body,
      source,
      model: ai?.model ?? null,
    })
    .select("created_at")
    .single();
  if (insertError) return { ok: false, error: "failed" };

  revalidatePath("/analyze");
  return { ok: true, body, source, createdAt: saved.created_at, lines, limited };
}
