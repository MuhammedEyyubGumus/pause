"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BatteryLow,
  Brain,
  Briefcase,
  CircleDashed,
  CircleQuestionMark,
  CloudLightning,
  CloudRain,
  DoorOpen,
  Eye,
  Flame,
  Footprints,
  Hand,
  Headphones,
  Heart,
  Hourglass,
  House,
  Layers,
  MapPin,
  Meh,
  Moon,
  Phone,
  Smile,
  Sparkles,
  Users,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { FlowOption } from "./types";

// Sistem seçeneklerinin ikonu koddan (anahtar -> ikon), kullanıcının kendi
// seçenekleri için ortak bir ikon.
const ICONS: Record<string, LucideIcon> = {
  // duygular
  "emotion:anxious": Zap,
  "emotion:overwhelmed": CloudLightning,
  "emotion:sad": CloudRain,
  "emotion:angry": Flame,
  "emotion:tired": BatteryLow,
  "emotion:bored": Meh,
  "emotion:empty": CircleDashed,
  "emotion:ok_but_urge": Smile,
  // tetikleyiciler
  "trigger:work": Briefcase,
  "trigger:family": House,
  "trigger:relationship": Heart,
  "trigger:social": Users,
  "trigger:thoughts": Brain,
  "trigger:fatigue": Moon,
  "trigger:cue": Eye,
  "trigger:place": MapPin,
  "trigger:stress": Activity,
  "trigger:unknown": CircleQuestionMark,
  // alternatifler
  "intervention:change_place": DoorOpen,
  "intervention:breathe": Wind,
  "intervention:move": Footprints,
  "intervention:reach_out": Phone,
  "intervention:music": Headphones,
  "intervention:relax_muscles": Hand,
  "intervention:urge_surf": Waves,
  "intervention:now_later_delegate": Layers,
  "intervention:just_wait": Hourglass,
};

export function OptionIcon({ option, className }: { option: FlowOption; className?: string }) {
  const Icon = (option.key && ICONS[`${option.kind}:${option.key}`]) || Sparkles;
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}

export function useOptionLabel() {
  const t = useTranslations("options");
  return (o: FlowOption) => (o.key ? t(`${o.kind}.${o.key}`) : (o.label ?? ""));
}
