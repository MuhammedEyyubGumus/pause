import { notFound } from "next/navigation";

import { EditBehavior } from "@/features/behaviors/edit-behavior";
import { requireOnboardedUser } from "@/lib/auth";

export default async function EditBehaviorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireOnboardedUser();

  const [{ data: behavior }, { count }] = await Promise.all([
    supabase
      .from("behaviors")
      .select("id, name, icon, template_key, why, goal, goal_text, pause_minutes, cost_amount, cost_currency")
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle(),
    supabase.from("behaviors").select("id", { count: "exact", head: true }).is("archived_at", null),
  ]);
  if (!behavior) notFound();

  return <EditBehavior behavior={behavior} isOnlyBehavior={(count ?? 0) <= 1} />;
}
