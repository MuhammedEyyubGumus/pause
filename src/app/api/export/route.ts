import { type NextRequest, NextResponse } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";

import { isTemplateKey } from "@/features/behaviors/templates";
import { toCsv } from "@/lib/export/csv";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

// "Verilerimi indir": kullanıcının kendi verisinin tamamı (JSON) ya da
// dürtü kayıtları tablo olarak (CSV). Oturumla çalışır; RLS yalnızca kendi verisini döndürür.
export const dynamic = "force-dynamic";

const PAGE = 1000; // Supabase tek istekte en fazla 1000 satır döndürür

// CSV sütunları (başlıklar messages/*.json > export.columns)
const COLUMNS = [
  "date", "hour", "behavior", "urgeBefore", "urgeAfter", "change", "pauseMin", "pauseStatus",
  "outcome", "emotions", "triggers", "tried", "source", "emergency", "note",
] as const;

type EventRow = Tables<"urge_events">;
type OptionLink = Pick<Tables<"event_emotions">, "event_id" | "option_id">;
type InterventionRow = Pick<Tables<"event_interventions">, "event_id" | "option_id" | "position" | "started_at" | "ended_at" | "completed" | "details">;
type AnswerRow = Pick<Tables<"event_answers">, "event_id" | "question_key" | "value_num" | "value_text">;
type OptionRow = Pick<Tables<"options">, "id" | "kind" | "key" | "label" | "user_id">;
type BehaviorRow = Tables<"behaviors">;

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const locale = await getLocale();
  const tb = await getTranslations("behaviors");
  const tOpt = await getTranslations("options");
  const tx = await getTranslations("export");

  const [profile, behaviors, options, events, emotions, triggers, interventions, answers, feedback] = await Promise.all([
    supabase.from("profiles").select("display_name, locale, timezone, created_at, consents").eq("id", user.id).maybeSingle(),
    supabase.from("behaviors").select("*").order("sort_order"),
    // Sistem seçenekleri + kullanıcının kendi seçenekleri (etiketler için)
    supabase.from("options").select("id, kind, key, label, user_id"),
    fetchAll<EventRow>((a, b) =>
      supabase.from("urge_events").select("*").is("deleted_at", null).order("occurred_at", { ascending: false }).range(a, b),
    ),
    fetchAll<OptionLink>((a, b) => supabase.from("event_emotions").select("event_id, option_id").range(a, b)),
    fetchAll<OptionLink>((a, b) => supabase.from("event_triggers").select("event_id, option_id").range(a, b)),
    fetchAll<InterventionRow>((a, b) =>
      supabase
        .from("event_interventions")
        .select("event_id, option_id, position, started_at, ended_at, completed, details")
        .range(a, b),
    ),
    fetchAll<AnswerRow>((a, b) => supabase.from("event_answers").select("event_id, question_key, value_num, value_text").range(a, b)),
    supabase.from("feedback").select("answers, would_reuse, created_at").order("created_at"),
  ]);

  const optionRows: OptionRow[] = options.data ?? [];
  const behaviorRows: BehaviorRow[] = behaviors.data ?? [];
  const optionById = new Map(optionRows.map((o) => [o.id, o]));
  const behaviorById = new Map(behaviorRows.map((b) => [b.id, b]));
  const label = (id: string | null | undefined) => {
    const o = id ? optionById.get(id) : undefined;
    if (!o) return "";
    return o.key ? tOpt(`${o.kind}.${o.key}`) : (o.label ?? "");
  };
  const behaviorName = (id: string) => {
    const b = behaviorById.get(id);
    if (!b) return "";
    return isTemplateKey(b.template_key) ? tb(b.template_key) : b.name;
  };
  const groupBy = <T extends { event_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.event_id, [...(m.get(r.event_id) ?? []), r]);
    return m;
  };
  const emotionsBy = groupBy(emotions);
  const triggersBy = groupBy(triggers);
  const interventionsBy = groupBy(interventions);
  const answersBy = groupBy(answers);

  const date = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "no-store" };

  if (format === "csv") {
    const isTr = locale === "tr";
    const head = COLUMNS.map((c) => tx(`columns.${c}`));
    const rows = events.map((e) => [
      e.local_date,
      e.local_hour,
      behaviorName(e.behavior_id),
      e.urge_before,
      e.urge_after,
      e.urge_change,
      e.pause_minutes,
      tx(`pauseStatus.${e.pause_status}`),
      label(e.outcome_option_id),
      (emotionsBy.get(e.id) ?? []).map((x) => label(x.option_id)).join(" | "),
      (triggersBy.get(e.id) ?? []).map((x) => label(x.option_id)).join(" | "),
      (interventionsBy.get(e.id) ?? [])
        .sort((a, b) => a.position - b.position)
        .map((x) => label(x.option_id))
        .join(" | "),
      tx(`source.${e.source}`),
      e.emergency_mode ? tx("yes") : "",
      e.notes,
    ]);
    return new NextResponse(toCsv([head, ...rows], isTr ? ";" : ","), {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${tx("fileName")}-${date}.csv"`,
      },
    });
  }

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile.data,
    behaviors: behaviorRows,
    custom_options: optionRows.filter((o) => o.user_id === user.id),
    events: events.map((e) => ({
      ...e,
      behavior_name: behaviorName(e.behavior_id),
      outcome_label: label(e.outcome_option_id) || null,
      emotions: (emotionsBy.get(e.id) ?? []).map((x) => label(x.option_id)),
      triggers: (triggersBy.get(e.id) ?? []).map((x) => label(x.option_id)),
      interventions: (interventionsBy.get(e.id) ?? []).map(({ event_id: _e, ...x }) => ({ ...x, label: label(x.option_id) })),
      answers: (answersBy.get(e.id) ?? []).map(({ event_id: _e, ...x }) => x),
    })),
    feedback: feedback.data ?? [],
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tx("jsonFileName")}-${date}.json"`,
    },
  });
}
