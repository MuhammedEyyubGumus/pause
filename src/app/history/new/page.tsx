import { RetroFlow } from "@/features/history/retro-flow";
import { loadFlowData } from "@/features/urge-flow/load";

// Uygulamayı açamadığın bir anı sonradan kaydet
export default async function RetroPage() {
  const { userId, timeZone, behaviors, options } = await loadFlowData();
  return <RetroFlow userId={userId} timeZone={timeZone} behaviors={behaviors} options={options} />;
}
