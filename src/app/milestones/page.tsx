import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { MilestoneIcon } from "@/features/milestones/icons";
import { parseMilestones } from "@/features/milestones/shared";
import { requireOnboardedUser } from "@/lib/auth";
import { safeTimeZone } from "@/lib/time/local";
import { cn } from "@/lib/utils";

// Öğrenme kilometre taşları (brief bölüm 28). Streak yok; hiçbir taş geri alınmaz,
// davranış gerçekleşse bile "sıfırlanma" yoktur.
export default async function MilestonesPage() {
  const { supabase, profile } = await requireOnboardedUser();
  const t = await getTranslations("milestones");
  const locale = await getLocale();

  const { data, error } = await supabase.rpc("get_milestones");
  if (error) throw error;
  const items = parseMilestones(data);
  const done = items.filter((i) => i.achievedAt).length;
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: safeTimeZone(profile.timezone) });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex h-14 items-center gap-2">
        <Link
          href="/insights"
          aria-label={t("back")}
          className="tap-target-sm -ms-3 grid place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-6 rtl:rotate-180" />
        </Link>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </header>

      <main className="flex flex-col gap-5 py-4">
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground">{t("intro")}</p>
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary" style={{ width: `${(done / items.length) * 100}%` }} />
            </div>
            <span className="numeric text-sm font-semibold">{t("progress", { done, total: items.length })}</span>
          </div>
        </div>

        <ol className="relative flex flex-col gap-3">
          <span className="absolute start-6 top-6 bottom-6 w-0.5 -translate-x-1/2 bg-border rtl:translate-x-1/2" aria-hidden />
          {items.map((m, i) => (
            <li key={m.key} className="animate-fade-up relative flex items-start gap-4" style={{ animationDelay: `${i * 50}ms` }}>
              <span
                className={cn(
                  "relative z-10 grid size-12 shrink-0 place-items-center rounded-full",
                  m.achievedAt ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-2 ring-border",
                )}
              >
                <MilestoneIcon name={m.key} className="size-5" />
              </span>
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col gap-0.5 rounded-card p-4",
                  m.achievedAt ? "bg-card shadow-[0_1px_2px_oklch(0_0_0/0.04)]" : "bg-muted/50",
                )}
              >
                <span className={cn("font-semibold", !m.achievedAt && "text-muted-foreground")}>
                  {t(`items.${m.key}.title`)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {m.achievedAt ? fmt.format(new Date(m.achievedAt)) : t(`items.${m.key}.hint`)}
                </span>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">{t("note")}</p>
      </main>
    </div>
  );
}
