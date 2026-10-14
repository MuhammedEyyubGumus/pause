"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { getSessionProfile } from "@/lib/auth";
import type { Json } from "@/types/database";

import {
  BEHAVIOR_GOALS,
  CURRENCIES,
  CUSTOM_BEHAVIOR_ICON,
  iconForTemplate,
  PAUSE_MINUTES,
  SAFETY_TEMPLATES,
  TEMPLATE_KEYS,
} from "./templates";

export type BehaviorActionResult = { ok: false; error: "invalid" | "save_failed" | "last_active" };


// ---------------------------------------------------------------------------
// Ekle: hazır şablon ya da kendi davranışı.
// Şablon daha önce arşivlendiyse yeni satır açılmaz; eski satır (ve geçmişi) geri gelir.
// ---------------------------------------------------------------------------
const addSchema = z.union([
  z.object({ templateKey: z.enum(TEMPLATE_KEYS), safetyAcknowledged: z.boolean().default(false) }),
  z.object({ customName: z.string().trim().min(1).max(40) }),
]);

export async function addBehavior(input: z.input<typeof addSchema>): Promise<BehaviorActionResult | void> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { supabase, user, profile } = await getSessionProfile();

  const { data: existing } = await supabase
    .from("behaviors")
    .select("id, template_key, archived_at, sort_order")
    .eq("user_id", user.id);
  const nextOrder = Math.max(-1, ...(existing ?? []).map((b) => b.sort_order)) + 1;

  if ("templateKey" in parsed.data) {
    const { templateKey, safetyAcknowledged } = parsed.data;
    const sameTemplate = (existing ?? []).filter((b) => b.template_key === templateKey);
    const active = sameTemplate.find((b) => !b.archived_at);
    // Zaten aktif: yeni kayıt açma, düzenleme ekranına git
    if (active) redirect(`/settings/behaviors/${active.id}`);
    // Daha önce arşivlenmişse en son arşivleneni geri getir (geçmiş kayıtlarıyla birlikte)
    const previous = sameTemplate.sort((a, b) => (b.archived_at ?? "").localeCompare(a.archived_at ?? ""))[0];

    if (previous) {
      const { error } = await supabase
        .from("behaviors")
        .update({ archived_at: null, is_active: true, sort_order: nextOrder })
        .eq("id", previous.id);
      if (error) return { ok: false, error: "save_failed" };
    } else {
      const t = await getTranslations("behaviors");
      const { error } = await supabase.from("behaviors").insert({
        template_key: templateKey,
        name: t(templateKey),
        icon: iconForTemplate(templateKey),
        sort_order: nextOrder,
      });
      if (error) return { ok: false, error: "save_failed" };
    }

    // Alkol / yeme eklenirken güvenlik notu gösterildiyse kaydet
    if (safetyAcknowledged && SAFETY_TEMPLATES.includes(templateKey)) {
      const previousConsents =
        profile?.consents && typeof profile.consents === "object" && !Array.isArray(profile.consents)
          ? profile.consents
          : {};
      const consents: Json = { ...previousConsents, safety_notice_ack: new Date().toISOString() };
      await supabase.from("profiles").update({ consents }).eq("id", user.id);
    }
  } else {
    const { error } = await supabase.from("behaviors").insert({
      template_key: null,
      name: parsed.data.customName,
      icon: CUSTOM_BEHAVIOR_ICON,
      sort_order: nextOrder,
    });
    if (error) return { ok: false, error: "save_failed" };
  }

  revalidatePath("/", "layout");
  redirect("/settings");
}

// ---------------------------------------------------------------------------
// Düzenle: ad (yalnızca kendi davranışlarında), neden, hedef, pause süresi
// ---------------------------------------------------------------------------
const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(40).optional(),
  why: z.string().trim().max(280),
  goal: z.enum(BEHAVIOR_GOALS),
  goalText: z.string().trim().max(140),
  pauseMinutes: z
    .number()
    .int()
    .refine((m) => (PAUSE_MINUTES as readonly number[]).includes(m)),
  // Bir seferde ortalama harcanan tutar (para harcanan davranışlar için, isteğe bağlı)
  costAmount: z.number().min(0).max(100000).nullable(),
  costCurrency: z.enum(CURRENCIES),
});

export async function updateBehavior(input: z.input<typeof updateSchema>): Promise<BehaviorActionResult | void> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, name, why, goal, goalText, pauseMinutes, costAmount, costCurrency } = parsed.data;

  const { supabase } = await getSessionProfile();
  const { data: behavior } = await supabase.from("behaviors").select("template_key").eq("id", id).maybeSingle();
  if (!behavior) return { ok: false, error: "invalid" };

  const { error } = await supabase
    .from("behaviors")
    .update({
      // Hazır şablonların adı dile göre çevrildiği için değiştirilmez
      ...(behavior.template_key == null && name ? { name } : {}),
      why: why || null,
      goal,
      goal_text: goal === "custom" ? goalText || null : null,
      pause_minutes: pauseMinutes,
      cost_amount: costAmount == null ? null : Math.round(costAmount * 100) / 100,
      cost_currency: costCurrency,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "save_failed" };

  revalidatePath("/", "layout");
  redirect("/settings");
}

// ---------------------------------------------------------------------------
// Takibi bırak: arşivlenir, geçmiş kayıtlar silinmez. En az bir aktif davranış kalmalı.
// ---------------------------------------------------------------------------
export async function archiveBehavior(id: string): Promise<BehaviorActionResult | void> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "invalid" };

  const { supabase } = await getSessionProfile();
  const { count } = await supabase
    .from("behaviors")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .neq("id", id);
  if (!count) return { ok: false, error: "last_active" };

  const { error } = await supabase
    .from("behaviors")
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .eq("id", id);
  if (error) return { ok: false, error: "save_failed" };

  revalidatePath("/", "layout");
  redirect("/settings");
}
