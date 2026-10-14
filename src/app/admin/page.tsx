import { Activity, Bell, Link2, MessageSquareText, Star, UserCheck, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { requireAdmin } from "@/features/admin/guard";
import { BarList, PageTitle, Panel, StatTile } from "@/features/admin/ui";
import { isTemplateKey } from "@/features/behaviors/templates";
import { fmtPercent } from "@/features/insights/format";

type Overview = {
  users: number;
  onboarded: number;
  new_users_7d: number;
  active_7d: number;
  active_30d: number;
  events: number;
  events_7d: number;
  paused_share: number | null;
  remeasured_share: number | null;
  reflections: number;
  experiments: number;
  push_users: number;
  feedback: number;
  feedback_new: number;
  avg_reuse: number | null;
  behaviors: { key: string; count: number }[];
};

// Genel bakış: yalnızca toplamlar. Kimsenin kişisel kaydı burada görünmez.
export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin.overview");
  const tb = await getTranslations("behaviors");
  const locale = await getLocale();

  const { data, error } = await supabase.rpc("admin_overview");
  if (error) throw error;
  const o = data as unknown as Overview;
  const n = (v: number | null | undefined) => new Intl.NumberFormat(locale).format(Number(v ?? 0));

  return (
    <>
      <PageTitle title={t("title")} hint={t("privacy")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          icon={<Users className="size-6" />}
          label={t("users")}
          value={n(o.users)}
          sub={t("usersSub", { onboarded: n(o.onboarded), week: n(o.new_users_7d) })}
        />
        <StatTile
          icon={<UserCheck className="size-6" />}
          label={t("active")}
          value={n(o.active_7d)}
          sub={t("activeSub", { month: n(o.active_30d) })}
        />
        <StatTile
          icon={<Activity className="size-6" />}
          label={t("events")}
          value={n(o.events)}
          sub={t("eventsSub", { week: n(o.events_7d) })}
        />
        <StatTile
          icon={<Activity className="size-6" />}
          label={t("pausedShare")}
          value={fmtPercent(o.paused_share, locale)}
          sub={t("remeasuredShare", { pct: fmtPercent(o.remeasured_share, locale) })}
        />
        <StatTile
          icon={<Link2 className="size-6" />}
          label={t("reflections")}
          value={n(o.reflections)}
          sub={t("experiments", { count: n(o.experiments) })}
        />
        <StatTile icon={<Bell className="size-6" />} label={t("push")} value={n(o.push_users)} />
        <StatTile
          icon={<MessageSquareText className="size-6" />}
          label={t("feedback")}
          value={n(o.feedback)}
          sub={t("feedbackNew", { count: n(o.feedback_new) })}
        />
        <StatTile
          icon={<Star className="size-6" />}
          label={t("reuse")}
          value={o.avg_reuse != null ? `${o.avg_reuse} / 10` : "–"}
        />
      </div>

      <Panel title={t("behaviors")}>
        {o.behaviors.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <BarList
            rows={o.behaviors.map((b) => ({
              label: isTemplateKey(b.key) ? tb(b.key) : t("customBehavior"),
              value: Number(b.count),
            }))}
          />
        )}
      </Panel>
    </>
  );
}
