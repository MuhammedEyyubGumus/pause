import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { requireAdmin } from "@/features/admin/guard";
import { BarList, PageTitle, Panel, StatTile } from "@/features/admin/ui";
import { fmtPercent } from "@/features/insights/format";
import { cn } from "@/lib/utils";

type Metrics = {
  days: number;
  onboarding: { step: string; sessions: number }[];
  onboarding_completed: number;
  flow: { started: number; pause_completed: number; completed: number; interventions: number; reviews: number };
  drop_off: { step: string; sessions: number }[];
  interventions: { key: string | null; started: number; completed: number }[];
  screens: { name: string; count: number; sessions: number }[];
};

const PERIODS = [7, 14, 30, 90] as const;
const ONBOARDING_ORDER = ["welcome", "behaviors", "timing", "how", "safety", "goal"];
// Çevirisi olan adım / ekran adları (messages > admin.metrics.steps)
const STEP_KEYS = new Set([
  "behavior", "intensity", "pause", "emotions", "triggers", "question", "pick", "intervention", "waiting", "sos",
  "sosBefore", "remeasure", "change", "sosBehavior", "outcome", "data", ...ONBOARDING_ORDER,
  "app_opened", "insights_viewed", "weekly_review_opened", "review_started", "feedback_sent", "push_enabled",
]);
// Sistem alternatiflerinin anahtarları (messages > options.intervention)
const INTERVENTION_KEYS = new Set([
  "change_place", "breathe", "move", "reach_out", "music", "relax_muscles", "urge_surf", "now_later_delegate", "just_wait",
]);

// Anonim ürün ölçümü (brief bölüm 41): hesaba bağlı değil, içerik içermez.
export default async function AdminMetricsPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const days = PERIODS.find((p) => String(p) === d) ?? 14;
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin.metrics");
  const tOpt = await getTranslations("options");
  const locale = await getLocale();

  const { data, error } = await supabase.rpc("admin_product_metrics", { p_days: days });
  if (error) throw error;
  const m = data as unknown as Metrics;

  const stepLabel = (s: string) => (STEP_KEYS.has(s) ? t(`steps.${s}`) : s);
  const onboarding = [...m.onboarding].sort((a, b) => ONBOARDING_ORDER.indexOf(a.step) - ONBOARDING_ORDER.indexOf(b.step));
  const pct = (a: number, b: number) => (b > 0 ? fmtPercent(a / b, locale) : "–");

  return (
    <>
      <PageTitle title={t("title")} hint={t("hint")} />

      <nav className="flex gap-2" aria-label={t("period")}>
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/admin/metrics?d=${p}`}
            aria-current={p === days ? "page" : undefined}
            className={cn(
              "tap-target-sm inline-flex items-center rounded-full border-2 px-4 text-sm font-semibold",
              p === days ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
            )}
          >
            {t("days", { count: p })}
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={<span className="font-bold">1</span>} label={t("flowStarted")} value={String(m.flow.started)} />
        <StatTile
          icon={<span className="font-bold">2</span>}
          label={t("pauseCompleted")}
          value={String(m.flow.pause_completed)}
          sub={pct(m.flow.pause_completed, m.flow.started)}
        />
        <StatTile
          icon={<span className="font-bold">3</span>}
          label={t("flowCompleted")}
          value={String(m.flow.completed)}
          sub={pct(m.flow.completed, m.flow.started)}
        />
        <StatTile
          icon={<span className="font-bold">+</span>}
          label={t("interventionsStarted")}
          value={String(m.flow.interventions)}
          sub={t("reviews", { count: m.flow.reviews })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("dropOff")}>
          <p className="-mt-2 text-sm text-muted-foreground">{t("dropOffHint")}</p>
          {m.drop_off.length ? (
            <BarList rows={m.drop_off.map((r) => ({ label: stepLabel(r.step), value: Number(r.sessions) }))} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          )}
        </Panel>

        <Panel title={t("onboarding")}>
          <p className="-mt-2 text-sm text-muted-foreground">
            {t("onboardingCompleted", { count: m.onboarding_completed })}
          </p>
          {onboarding.length ? (
            <BarList rows={onboarding.map((r) => ({ label: stepLabel(r.step), value: Number(r.sessions) }))} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          )}
        </Panel>

        <Panel title={t("interventions")}>
          {m.interventions.length ? (
            <BarList
              rows={m.interventions.map((r) => ({
                label: r.key && INTERVENTION_KEYS.has(r.key) ? tOpt(`intervention.${r.key}`) : t("custom"),
                value: Number(r.started),
                sub: t("completedPct", { pct: pct(Number(r.completed), Number(r.started)) }),
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          )}
        </Panel>

        <Panel title={t("screens")}>
          {m.screens.length ? (
            <BarList
              rows={m.screens.map((r) => ({
                label: stepLabel(r.name),
                value: Number(r.count),
                sub: t("sessions", { count: Number(r.sessions) }),
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          )}
        </Panel>
      </div>
    </>
  );
}
