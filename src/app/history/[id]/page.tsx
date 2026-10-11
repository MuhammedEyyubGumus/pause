import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";

import { EventDetail } from "@/features/history/event-detail";
import { loadFlowData, loadServerEvent } from "@/features/urge-flow/load";
import { formatDateTime } from "@/lib/time/format";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, timeZone, behaviors, options } = await loadFlowData();
  const event = await loadServerEvent(supabase, userId, id);
  if (!event) notFound();

  // Arşivlenmiş bir davranışa ait eski kayıtlar da adıyla görünsün
  const { data: allBehaviors } = await supabase.from("behaviors").select("id, name, icon, template_key, pause_minutes");
  const locale = await getLocale();

  return (
    <EventDetail
      event={event}
      title={formatDateTime(event.row.occurred_at ?? new Date().toISOString(), locale, timeZone)}
      behaviors={behaviors}
      allBehaviors={allBehaviors ?? behaviors}
      options={options}
    />
  );
}
