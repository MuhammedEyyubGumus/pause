import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  progress: number; // 0 → 1
  label: string; // "09:41"
  size?: number;
  className?: string;
  children?: ReactNode;
};

// Yavaş ve sürekli dolan halka; rakamlar ikincil.
export function TimerRing({ progress, label, size = 240, className, children }: Props) {
  const stroke = Math.max(4, size * 0.025);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--pause-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          // Sunucu ve tarayıcı süreyi birkaç ms farkla hesaplar; 0,5 sn sonra zaten güncellenir
          suppressHydrationWarning
          style={{ transition: "stroke-dashoffset 600ms linear" }}
        />
      </svg>
      <div className="relative flex flex-col items-center">
        <span
          className="numeric font-semibold tracking-tight"
          style={{ fontSize: size * 0.22 }}
          role="timer"
          suppressHydrationWarning
        >
          {label}
        </span>
        {children}
      </div>
    </div>
  );
}
