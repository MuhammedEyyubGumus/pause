import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

// Aynı istek içinde birden fazla çağrılsa da tek sorgu yapılır.
export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  return { supabase, user, profile };
});

// Onboarding'i bitirmemiş kullanıcıyı onboarding'e gönderir.
export async function requireOnboardedUser() {
  const ctx = await getSessionProfile();
  if (!ctx.profile?.onboarding_completed_at) redirect("/onboarding");
  return { ...ctx, profile: ctx.profile };
}
