import { LifeBuoy, Settings2 } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { AppNav } from "@/components/pause/app-nav";
import { ReviewReminder } from "@/features/home/review-reminder";
import { UrgeArea } from "@/features/home/urge-area";
import { NotifyPrompt } from "@/features/notifications/notify-prompt";
import { findActivePause } from "@/features/urge-flow/load";
import { requireOnboardedUser } from "@/lib/auth";
import { SyncAgent } from "@/lib/offline/sync-agent";
import { dayPart, localParts } from "@/lib/time/local";

export default async function HomePage() {
  const { supabase, user, profile } = await requireOnboardedUser();
  const t = await getTranslations("home");
  const locale = await getLocale();

  const now = localParts(new Date(), profile.timezone);
  const greeting = t(dayPart(now.hour));

  const { data: events } = await supabase
    .from("urge_events")
    .select("pause_status, urge_before")
    .eq("local_date", now.date)
    .is("deleted_at", null);

  const [active, { count: completedCount }, { data: recentOccurred }] = await Promise.all([
    findActivePause(supabase),
    // Bildirim izni ilk tamamlanan pause'dan sonra sorulur
    supabase.from("urge_events").select("id", { count: "exact", head: true }).eq("pause_status", "completed"),
    // Son 3 günde davranışın gerçekleştiği ama zinciri incelenmemiş kayıt
    supabase
      .from("urge_events")
      .select("id, reflections(id)")
      .in("outcome_class", ["occurred", "stopped_early"])
      .is("deleted_at", null)
      .gte("occurred_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
      .order("occurred_at", { ascending: false })
      .limit(5),
  ]);
  const toReview = (recentOccurred ?? []).find((e) => e.reflections.length === 0);

  const urges = events?.length ?? 0;
  const paused = events?.filter((e) => e.pause_status !== "none").length ?? 0;
  const intensities = (events ?? []).flatMap((e) => (e.urge_before == null ? [] : [e.urge_before]));
  const avgIntensity = intensities.length
    ? new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(intensities.reduce((a, b) => a + b, 0) / intensities.length)
    : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe">
      <SyncAgent />
      <header className="flex h-14 items-center justify-between">
        <span className="text-sm font-bold tracking-[0.35em] text-primary">PAUSE</span>
        <Link
          href="/settings"
          aria-label={t("settings")}
          className="tap-target-sm -me-3 grid place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings2 className="size-6" strokeWidth={1.75} />
        </Link>
      </header>

      <section className="animate-fade-up mt-4 flex flex-col gap-1">
        <h1 className="text-question">
          {profile.display_name ? t("greetingWithName", { greeting, name: profile.display_name }) : greeting}
        </h1>
        <p className="text-muted-foreground">
          {urges === 0 ? t("todayEmpty") : t("todayCounts", { urges, pauses: paused })}
          {avgIntensity && ` · ${t("todayAvg", { value: avgIntensity })}`}
        </p>
      </section>

      {/* En büyük öğe: DÜRTÜ GELDİ ya da devam eden pause */}
      <section className="flex flex-1 flex-col items-center justify-center gap-5 py-10">
        <UrgeArea userId={user.id} serverActive={active} />
      </section>

      <div className="flex flex-col gap-4">
        <Link
          href="/sos"
          className="tap-target inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border px-6 font-semibold transition-colors hover:bg-card active:scale-[0.98]"
        >
          <LifeBuoy className="size-5 text-urge-high" strokeWidth={2} aria-hidden />
          {t("sos")}
        </Link>

        {toReview && !active && <ReviewReminder eventId={toReview.id} />}
        <NotifyPrompt hasCompletedPause={(completedCount ?? 0) > 0} />
        <SmallWin urges={urges} paused={paused} />
      </div>
      <AppNav />
    </div>
  );
}

async function SmallWin({ urges, paused }: { urges: number; paused: number }) {
  const t = await getTranslations("home");

  let title: string;
  let body: string;
  if (urges === 0) {
    title = t("emptyTitle");
    body = t("emptyBody");
  } else if (paused === 0) {
    title = t("winNoneTitle");
    body = t("winNone");
  } else {
    title = t("winTitle");
    body = paused === urges ? t("winAll", { total: urges }) : t("winSome", { total: urges, paused });
  }

  return (
    <aside className="rounded-card bg-card p-5 shadow-[0_1px_2px_oklch(0_0_0/0.04)]">
      <p className="text-sm font-semibold text-primary">{title}</p>
      <p className="mt-1 text-base">{body}</p>
    </aside>
  );
}
