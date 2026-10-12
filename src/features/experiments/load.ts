import "server-only";

import { getTranslations } from "next-intl/server";

import { behaviorLabel, optionLabel } from "@/features/history/labels";
import type { createClient } from "@/lib/supabase/server";

import { EXPERIMENT_COLUMNS, type Experiment, type ExperimentResults, parseResults } from "./shared";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function loadActiveExperiment(supabase: Supabase) {
  const { data } = await supabase
    .from("experiments")
    .select(EXPERIMENT_COLUMNS)
    .eq("status", "active")
    .maybeSingle();
  return (data as Experiment | null) ?? null;
}

export async function loadResults(supabase: Supabase, id: string): Promise<ExperimentResults> {
  const { data } = await supabase.rpc("experiment_results", { p_experiment: id });
  return parseResults(data);
}

// Kuralın okunur hali: ["Sosyal medya · İş kaynaklı dürtü ≥ 7", "Ortam değiştir", "PAUSE"]
export async function describeRule(supabase: Supabase, x: Experiment) {
  const t = await getTranslations("experiment");
  const tOpt = await getTranslations("options");
  const tb = await getTranslations("behaviors");

  const ids = [x.trigger_option_id, x.intervention_option_id].filter((v): v is string => !!v);
  const [{ data: options }, { data: behavior }] = await Promise.all([
    supabase.from("options").select("id, kind, key, label").in("id", ids),
    x.behavior_id
      ? supabase.from("behaviors").select("name, template_key").eq("id", x.behavior_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const byId = new Map((options ?? []).map((o) => [o.id, o]));
  const trigger = x.trigger_option_id ? byId.get(x.trigger_option_id) : undefined;
  const intervention = byId.get(x.intervention_option_id);

  const when = trigger ? t("whenTrigger", { trigger: optionLabel(trigger, tOpt) }) : t("whenAny");
  const threshold = x.min_urge > 0 ? ` ≥ ${x.min_urge}` : "";
  return {
    behavior: behavior ? behaviorLabel(behavior, tb) : null,
    steps: [`${when}${threshold}`, intervention ? optionLabel(intervention, tOpt) : "—", "PAUSE"],
  };
}
