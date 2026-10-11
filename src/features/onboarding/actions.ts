"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { CUSTOM_BEHAVIOR_ICON, iconForTemplate, TEMPLATE_KEYS, USUAL_TIMES } from "@/features/behaviors/templates";
import { isLocale } from "@/i18n/config";
import { getSessionProfile } from "@/lib/auth";
import { safeTimeZone } from "@/lib/time/local";
import type { Json } from "@/types/database";

const schema = z
  .object({
    templates: z.array(z.enum(TEMPLATE_KEYS)).max(TEMPLATE_KEYS.length),
    customName: z.string().trim().min(1).max(40).optional(),
    usualTimes: z.array(z.enum(USUAL_TIMES)).max(USUAL_TIMES.length),
    safetyAcknowledged: z.boolean(),
    timeZone: z.string().max(64),
  })
  .refine((d) => d.templates.length + (d.customName ? 1 : 0) >= 1);

export type OnboardingInput = z.input<typeof schema>;
export type OnboardingResult = { ok: false; error: "invalid" | "save_failed" };

export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult | void> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { templates, customName, usualTimes, safetyAcknowledged, timeZone } = parsed.data;

  const { supabase, user, profile } = await getSessionProfile();
  if (profile?.onboarding_completed_at) redirect("/");

  const t = await getTranslations("behaviors");
  const usual_times = [...new Set(usualTimes)];

  const rows = [
    ...templates.map((key, i) => ({
      template_key: key,
      name: t(key),
      icon: iconForTemplate(key),
      sort_order: i,
      usual_times,
    })),
    ...(customName
      ? [{ template_key: null, name: customName, icon: CUSTOM_BEHAVIOR_ICON, sort_order: templates.length, usual_times }]
      : []),
  ];

  // Onboarding henüz bitmediği için bu kullanıcının olayı olamaz; yarım kalmış
  // önceki bir denemenin davranışlarını temizleyip baştan yazmak güvenli.
  const { error: cleanupError } = await supabase.from("behaviors").delete().eq("user_id", user.id);
  if (cleanupError) return { ok: false, error: "save_failed" };

  const { error: insertError } = await supabase.from("behaviors").insert(rows);
  if (insertError) return { ok: false, error: "save_failed" };

  const locale = await getLocale();
  const previousConsents =
    profile?.consents && typeof profile.consents === "object" && !Array.isArray(profile.consents)
      ? profile.consents
      : {};
  const consents: Json = safetyAcknowledged
    ? { ...previousConsents, safety_notice_ack: new Date().toISOString() }
    : previousConsents;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      onboarding_completed_at: new Date().toISOString(),
      timezone: safeTimeZone(timeZone),
      consents,
      ...(isLocale(locale) ? { locale } : {}),
    })
    .eq("id", user.id);
  if (profileError) return { ok: false, error: "save_failed" };

  revalidatePath("/", "layout");
  redirect("/");
}
