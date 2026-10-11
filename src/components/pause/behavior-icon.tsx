import type { LucideIcon } from "lucide-react";
import {
  Cigarette,
  Gamepad2,
  Hand,
  Hourglass,
  Moon,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Utensils,
  Wine,
} from "lucide-react";

// Veritabanındaki icon anahtarı -> ikon bileşeni.
// Yeni ikon eklenecekse yalnızca buraya eklenir.
const ICONS: Record<string, LucideIcon> = {
  cigarette: Cigarette,
  utensils: Utensils,
  wine: Wine,
  smartphone: Smartphone,
  "gamepad-2": Gamepad2,
  "shopping-bag": ShoppingBag,
  hourglass: Hourglass,
  hand: Hand,
  moon: Moon,
  sparkles: Sparkles,
};

export function BehaviorIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && ICONS[name]) || Sparkles;
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}
