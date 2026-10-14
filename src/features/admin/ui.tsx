import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <header className="flex flex-col gap-1 pt-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {hint && <p className="max-w-2xl text-sm text-muted-foreground">{hint}</p>}
    </header>
  );
}

export function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_1px_3px_oklch(0_0_0/0.06)]", className)}>
      {title && <h2 className="font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function StatTile({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-[0_1px_3px_oklch(0_0_0/0.06)]">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="numeric text-2xl font-bold">{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </span>
    </div>
  );
}

// Tek serili yatay çubuk listesi: etiket, değer, oran
export function BarList({ rows, max }: { rows: { label: string; value: number; sub?: string }[]; max?: number }) {
  const top = Math.max(1, max ?? Math.max(0, ...rows.map((r) => r.value)));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{r.label}</span>
            <span className="numeric shrink-0 text-muted-foreground">
              {r.value}
              {r.sub && <span className="ms-2 text-xs">{r.sub}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((r.value / top) * 100, r.value ? 2 : 0)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
