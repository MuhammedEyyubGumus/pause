import { notFound } from "next/navigation";

import { CHAIN_STEPS, type ChainStep } from "@/features/reflect/chain";
import { type Reflection, ReflectFlow } from "@/features/reflect/reflect-flow";
import { loadFlowData, loadServerEvent } from "@/features/urge-flow/load";

// Davranış zincirini inceleme (brief bölüm 17–18). Dürtü akışındaki
// "Şimdi incele"den ya da Geçmiş'teki kayıttan açılır.
export default async function ReflectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const { supabase, userId, behaviors, options } = await loadFlowData();

  const [event, { data: existing }, { data: allBehaviors }] = await Promise.all([
    loadServerEvent(supabase, userId, id),
    supabase
      .from("reflections")
      .select("thought, first_action, duration_minutes, cut_point, next_option_id")
      .eq("event_id", id)
      .maybeSingle(),
    supabase.from("behaviors").select("id, name, icon, template_key, pause_minutes"),
  ]);
  if (!event) notFound();

  const cut = existing?.cut_point;
  const reflection: Reflection | null = existing
    ? { ...existing, cut_point: cut && (CHAIN_STEPS as readonly string[]).includes(cut) ? (cut as ChainStep) : null }
    : null;

  return (
    <ReflectFlow
      userId={userId}
      event={event}
      behavior={(allBehaviors ?? behaviors).find((b) => b.id === event.row.behavior_id)}
      options={options}
      existing={reflection}
      backHref={from === "history" ? `/history/${id}` : "/"}
    />
  );
}
