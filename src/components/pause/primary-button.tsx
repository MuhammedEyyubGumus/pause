import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type Props = ComponentProps<"button"> & {
  loading?: boolean;
  variant?: "primary" | "quiet";
};

// Ekranın altındaki tek ana buton. 56px yükseklik, başparmak bölgesinde.
export function PrimaryButton({ loading, variant = "primary", className, children, disabled, ...props }: Props) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 text-lg font-semibold",
        "transition-[transform,background-color,opacity] duration-150 ease-calm active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "quiet" && "bg-transparent text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      {loading && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
