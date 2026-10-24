import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AnalyzePanel } from "@/features/ai/analyze-panel";
import { ANALYZE_MIN_URGES, type Facts, factLines } from "@/features/ai/facts";
import { behaviorLabel } from "@/features/history/labels";
import { parseInsights, parsePeriod, PERIODS, periodStart, type Period } from "@/features/insights/analyze";
import { requireOnboardedUser } from "@/lib/auth";
import { localParts } from "@/lib/time/local";
import { cn } from "@/lib/utils";

// Yapay zekâ yorumu bir istek içinde Claude'u bekleyebilir
export const maxDuration = 30;

// "Pattern'lerimi analiz et" (brief bölüm 29). Sayılar sunucuda hesaplanır; yorum Claude'dan
// ya da (anahtar yoksa / kural dışıysa) hazır metinden gelir.
export default async function AnalyzePage({ searchParams }: { searchParams: Promise<{ p?: string; b?: string }> }) {
  const params = await searchParams;
  const { supabase, profile } = await requireOnboardedUser();
  const t = await getTranslations("analyze");
  const ti = await getTranslations("insights");
  const tf = await getTranslations("analyze.facts");
  const tb = await getTranslations("behaviors");

  const period = parsePeriod(params.p);
  const today = localParts(new Date(), profile.timezone).date;

  const { data: behaviors } = await supabase
    .from("behaviors")
    .select("id, name, template_key")
    .is("archived_at", null)
    .order("sort_order");
  const behaviorId = behaviors?.some((b) => b.id === params.b) ? params.b! : null;

  let latestQuery = supabase
    .from("ai_analyses")
    .select("body, source, created_at, facts")
    .eq("period", period)
    .order("created_at", { ascending: false })
    .limit(1);
  latestQuery = behaviorId ? latestQuery.eq("behavior_id", behaviorId) : latestQuery.is("behavior_id", null);

  const [{ data: raw }, { data: latestRow }] = await Promise.all([
    supabase.rpc("get_insights", {
      ...(periodStart(today, period) ? { p_from: periodStart(today, period)! } : {}),
      ...(behaviorId ? { p_behavior: behaviorId } : {}),
    }),
    latestQuery.maybeSingle(),
  ]);
  const urges = parseInsights(raw).totals.urges;

  const latest = latestRow
    ? {
        body: latestRow.body,
        source: latestRow.source === "ai" ? ("ai" as const) : ("template" as const),
        createdAt: latestRow.created_at,
        lines: factLines(latestRow.facts as unknown as Facts, tf),
      }
    : null;

  const href = (p: Period, b: string | null) => {
    const q = new URLSearchParams();
    if (p !== "30") q.set("p", p);
    if (b) q.set("b", b);
    const s = q.toString();
    return s ? `/analyze?${s}` : "/analyze";
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex h-14 items-center gap-2">
        <Link
          href={behaviorId ? `/insights?b=${behaviorId}` : "/insights"}
          aria-label={t("back")}
          className="tap-target-sm -ms-3 grid place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-6 rtl:rotate-180" />
        </Link>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </header>

      <nav aria-label={ti("periodLabel")} className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={href(p, behaviorId)}
            aria-current={p === period ? "page" : undefined}
            replace
            scroll={false}
            className={cn(
              "tap-target-sm grid place-items-center rounded-lg text-sm font-semibold transition-colors",
              p === period ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {ti(`periods.${p}`)}
          </Link>
        ))}
      </nav>

      {(behaviors?.length ?? 0) > 1 && (
        <nav
          aria-label={ti("behaviorLabel")}
          className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {[{ id: null, label: ti("allBehaviors") }, ...behaviors!.map((b) => ({ id: b.id, label: behaviorLabel(b, tb) }))].map(
            ({ id, label }) => (
              <Link
                key={id ?? "all"}
                href={href(period, id)}
                aria-current={id === behaviorId ? "page" : undefined}
                replace
                scroll={false}
                className={cn(
                  "tap-target-sm inline-flex shrink-0 items-center rounded-full border-2 px-4 text-sm font-semibold transition-colors",
                  id === behaviorId
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            ),
          )}
        </nav>
      )}

      <main className="flex flex-col gap-4 py-4">
        <p className="text-muted-foreground">{t("intro")}</p>
        <AnalyzePanel
          key={`${period}-${behaviorId ?? "all"}`}
          consent={!!profile.ai_consent_at}
          latest={latest}
          period={period}
          behaviorId={behaviorId}
          urges={urges}
          minUrges={ANALYZE_MIN_URGES}
        />
      </main>
    </div>
  );
}
