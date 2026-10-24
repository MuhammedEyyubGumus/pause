import "server-only";

import { redirect } from "next/navigation";

import type { LocalEvent } from "@/lib/offline/db";
import { requireOnboardedUser } from "@/lib/auth";
import { safeTimeZone } from "@/lib/time/local";

import type { FlowBehavior, FlowOption } from "./types";

const ACTIVE_WINDOW_MS = 6 * 60 * 60 * 1000;

// Dürtü akışının ihtiyaç duyduğu her şey: aktif davranışlar ve seçenekler
// (sistem + kullanıcının kendi seçenekleri; RLS yalnızca bunları döndürür).
export async function loadFlowData() {
  const { supabase, user, profile } = await requireOnboardedUser();

  const [{ data: behaviors }, { data: options }] = await Promise.all([
    supabase
      .from("behaviors")
      .select("id, name, icon, template_key, pause_minutes, why")
      .eq("is_active", true)
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("options")
      .select("id, kind, key, label, behavior_id, behavior_template_key, outcome_class, sort_order")
      .eq("is_archived", false),
  ]);

  if (!behaviors?.length) redirect("/onboarding");

  return {
    supabase,
    userId: user.id,
    timeZone: safeTimeZone(profile.timezone),
    behaviors: behaviors as FlowBehavior[],
    options: (options ?? []) as FlowOption[],
  };
}

type Supabase = Awaited<ReturnType<typeof loadFlowData>>["supabase"];

// Son 6 saatte başlamış ve henüz sonucu girilmemiş pause
export async function findActivePause(supabase: Supabase) {
  const { data } = await supabase
    .from("urge_events")
    .select("id, pause_started_at, pause_ends_at")
    .eq("pause_status", "active")
    .is("deleted_at", null)
    .gt("pause_ends_at", new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString())
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// Sunucudaki olayı cihazdaki biçime çevirir (başka cihazdan devam etmek için)
export async function loadServerEvent(supabase: Supabase, userId: string, id: string): Promise<LocalEvent | null> {
  const { data } = await supabase
    .from("urge_events")
    .select(
      "*, event_emotions(option_id), event_triggers(option_id), event_interventions(id, option_id, position, started_at, ended_at, completed, details), event_answers(question_key, value_num)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;

  const {
    event_emotions,
    event_triggers,
    event_interventions,
    event_answers,
    user_id: _userId,
    urge_change: _urgeChange,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...row
  } = data;

  return {
    id: data.id,
    userId,
    row,
    emotions: event_emotions.map((e) => e.option_id),
    triggers: event_triggers.map((e) => e.option_id),
    interventions: event_interventions.map((i) => ({
      ...i,
      details: (i.details ?? {}) as Record<string, unknown>,
    })),
    answers: event_answers,
    synced: 1,
    updatedAt: Date.now(),
  };
}
