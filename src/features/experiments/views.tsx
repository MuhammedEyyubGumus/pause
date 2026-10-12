import { getLocale, getTranslations } from "next-intl/server";

import { fmtChange } from "@/features/insights/format";
import { cn } from "@/lib/utils";

import type { ExperimentResults } from "./shared";

// Deneyin kuralı: A → B → PAUSE (dikey, büyük ve okunur)
export function RuleChain({ steps, compact = false }: { steps: string[]; compact?: boolean }) {
  return (
    <ol className={cn("flex flex-col", compact ? "gap-1" : "gap-2")}>
      {steps.map((step, i) => (
        <li key={`${i}-${step}`} className="flex flex-col items-start gap-1">
          <span
            className={cn(
              "rounded-xl font-semibold",
              compact ? "px-3 py-1.5 text-sm" : "px-4 py-3 text-lg",
              i === steps.length - 1 ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            {step}
          </span>
          {i < steps.length - 1 && (
            <span className={cn("ps-4 text-muted-foreground", compact ? "text-sm" : "text-lg")} aria-hidden>
              ↓
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

// Fırsat / uygulandı ve iki durumun karşılaştırması (brief: uygulandığında −3.0, uygulanmadığında −0.8)
export async function ResultsView({ r }: { r: ExperimentResults }) {
  const t = await getTranslations("experiment");
  const locale = await getLocale();

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label={t("opportunities")} value={String(r.opportunities)} />
        <Stat label={t("applied")} value={String(r.applied)} />
        <Stat
          label={t("whenApplied")}
          value={fmtChange(r.applied_avg, locale)}
          sub={t("measured", { count: r.applied_measured })}
          positive={(r.applied_avg ?? 0) < 0}
        />
        <Stat
          label={t("whenNotApplied")}
          value={fmtChange(r.other_avg, locale)}
          sub={t("measured", { count: r.other_measured })}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t("noCausality")}</p>
    </div>
  );
}

function Stat({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-muted/70 p-3">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className={cn("numeric text-2xl font-bold", positive && "text-change-positive")}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}
