import { loadActiveExperiment } from "@/features/experiments/load";
import { NewExperiment } from "@/features/experiments/new-experiment";
import { loadFlowData } from "@/features/urge-flow/load";
import { localParts } from "@/lib/time/local";

// Yeni haftalık deney. Haftalık hikâyeden ?trigger=…&intervention=… ile gelinebilir.
export default async function NewExperimentPage({
  searchParams,
}: {
  searchParams: Promise<{ trigger?: string; intervention?: string; behavior?: string }>;
}) {
  const params = await searchParams;
  const { supabase, timeZone, behaviors, options } = await loadFlowData();
  const active = await loadActiveExperiment(supabase);

  // Yalnızca kullanıcının görebildiği ve doğru türdeki seçenekler kabul edilir
  const pick = (id: string | undefined, kind: "trigger" | "intervention") =>
    id && options.some((o) => o.id === id && o.kind === kind) ? id : null;

  return (
    <NewExperiment
      behaviors={behaviors}
      options={options}
      today={localParts(new Date(), timeZone).date}
      hasActive={!!active}
      initial={{
        behaviorId: behaviors.some((b) => b.id === params.behavior) ? params.behavior! : null,
        triggerId: pick(params.trigger, "trigger"),
        interventionId: pick(params.intervention, "intervention"),
      }}
    />
  );
}
