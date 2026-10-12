import type { LucideIcon } from "lucide-react";
import { Compass, FlaskConical, Hand, Hourglass, Layers, Link2, PenLine, Sparkles } from "lucide-react";

import type { MilestoneKey } from "./shared";

const ICONS: Record<MilestoneKey, LucideIcon> = {
  first_urge: PenLine,
  first_pause: Hourglass,
  first_alternative: Sparkles,
  first_stopped_early: Hand,
  ten_events: Layers,
  first_review: Link2,
  first_pattern: Compass,
  first_experiment: FlaskConical,
};

export function MilestoneIcon({ name, className }: { name: MilestoneKey; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}
