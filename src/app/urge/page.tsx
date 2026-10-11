import { redirect } from "next/navigation";

import { findActivePause, loadFlowData } from "@/features/urge-flow/load";
import { UrgeFlow } from "@/features/urge-flow/urge-flow";

export default async function UrgePage() {
  const { supabase, userId, timeZone, behaviors, options } = await loadFlowData();

  // Aynı anda iki pause olmasın
  const active = await findActivePause(supabase);
  if (active) redirect(`/pause/${active.id}`);

  return <UrgeFlow mode="live" userId={userId} timeZone={timeZone} behaviors={behaviors} options={options} />;
}
