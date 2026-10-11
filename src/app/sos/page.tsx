import { redirect } from "next/navigation";

import { findActivePause, loadFlowData } from "@/features/urge-flow/load";
import { UrgeFlow } from "@/features/urge-flow/urge-flow";

// Çok güçlü dürtü: hiçbir soru yok, timer ve nefes hemen başlar.
export default async function SosPage() {
  const { supabase, userId, timeZone, behaviors, options } = await loadFlowData();

  const active = await findActivePause(supabase);
  if (active) redirect(`/pause/${active.id}`);

  return <UrgeFlow mode="sos" userId={userId} timeZone={timeZone} behaviors={behaviors} options={options} />;
}
