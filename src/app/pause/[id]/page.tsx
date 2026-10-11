import { loadFlowData, loadServerEvent } from "@/features/urge-flow/load";
import { UrgeFlow } from "@/features/urge-flow/urge-flow";

// Devam eden bir pause'a dönüş. Olay önce cihazdan okunur (en güncel hali),
// cihazda yoksa sunucudaki kayıt kullanılır.
export default async function PausePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, timeZone, behaviors, options } = await loadFlowData();
  const serverEvent = await loadServerEvent(supabase, userId, id);

  return (
    <UrgeFlow
      mode="resume"
      eventId={id}
      serverEvent={serverEvent}
      userId={userId}
      timeZone={timeZone}
      behaviors={behaviors}
      options={options}
    />
  );
}
