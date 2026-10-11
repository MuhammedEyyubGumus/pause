import type { Database } from "@/types/database";

export type OptionKind = Database["public"]["Enums"]["option_kind"];
export type OutcomeClass = Database["public"]["Enums"]["outcome_class"];

export type FlowOption = {
  id: string;
  kind: OptionKind;
  key: string | null; // sistem seçeneği
  label: string | null; // kullanıcının kendi seçeneği
  behavior_id: string | null;
  behavior_template_key: string | null;
  outcome_class: OutcomeClass | null;
  sort_order: number;
};

export type FlowBehavior = {
  id: string;
  name: string;
  icon: string;
  template_key: string | null;
  pause_minutes: number;
};

// Bir seçenek bu davranışta gösterilir mi?
export function optionFitsBehavior(o: FlowOption, b: FlowBehavior | undefined) {
  if (o.behavior_id && o.behavior_id !== b?.id) return false;
  if (o.behavior_template_key && o.behavior_template_key !== b?.template_key) return false;
  return true;
}
