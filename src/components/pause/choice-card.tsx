"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  label: string;
  icon?: ReactNode;
  selected: boolean;
  onToggle: () => void;
  multiple?: boolean;
  className?: string;
};

// Büyük seçim kartı: duygu, tetikleyici, davranış, gün dilimi...
export function ChoiceCard({ label, icon, selected, onToggle, multiple = true, className }: Props) {
  return (
    <motion.button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={() => {
        // Seçerken çok hafif bir dokunsal geri bildirim (destekleyen telefonlarda)
        if (!selected) navigator.vibrate?.(6);
        onToggle();
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "relative flex min-h-[5.5rem] flex-col items-start justify-between gap-3 rounded-card border-2 p-4 text-start",
        "transition-colors duration-200 ease-calm",
        selected
          ? "border-primary bg-accent text-accent-foreground"
          : "border-transparent bg-card text-card-foreground shadow-[0_1px_2px_oklch(0_0_0/0.04)]",
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "grid size-10 place-items-center rounded-full transition-colors duration-200",
            selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          {icon}
        </span>
      )}
      <span className="text-base leading-tight font-semibold">{label}</span>

      {selected && (
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute end-3 top-3 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground"
          aria-hidden
        >
          <Check className="size-4" strokeWidth={3} />
        </motion.span>
      )}
    </motion.button>
  );
}
