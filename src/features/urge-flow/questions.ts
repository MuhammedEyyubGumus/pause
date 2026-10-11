import type { TemplateKey } from "@/features/behaviors/templates";

// Davranışa özel sorular. Her davranış aynı soruları sormaz:
// fiziksel açlık yemede anlamlı, sosyal medyada değil.
// Cevaplar event_answers tablosuna question_key ile yazılır.
export type BehaviorQuestion = {
  key: string;
  type: "scale"; // 0–10
  titleKey: string; // messages: urge.<titleKey>
  lowKey: string;
  highKey: string;
};

export const BEHAVIOR_QUESTIONS: Partial<Record<TemplateKey, BehaviorQuestion[]>> = {
  eating: [{ key: "physical_hunger", type: "scale", titleKey: "hungerTitle", lowKey: "hungerLow", highKey: "hungerHigh" }],
};

export function questionsFor(templateKey: string | null | undefined): BehaviorQuestion[] {
  if (!templateKey) return [];
  return BEHAVIOR_QUESTIONS[templateKey as TemplateKey] ?? [];
}
