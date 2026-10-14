import { ExternalLink, Star } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { FEEDBACK_STATUSES, type FeedbackStatus, FeedbackStatusButtons } from "@/features/admin/feedback-status";
import { requireAdmin } from "@/features/admin/guard";
import { PageTitle } from "@/features/admin/ui";
import { cn } from "@/lib/utils";

type Feedback = {
  id: string;
  created_at: string;
  answers: Record<string, string>;
  would_reuse: number | null;
  screenshot_path: string | null;
  app_version: string | null;
  user_agent: string | null;
  admin_status: FeedbackStatus;
};

// Test grubunun geri bildirim formundaki sorular (features/feedback/feedback-form.tsx ile aynı sıra)
const QUESTIONS = ["hard", "unclear", "unnecessary", "helpful", "wish"] as const;

// Geri bildirimler: kimlik gösterilmez; yalnızca cevaplar, puan ve ekran görüntüsü.
export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const status = (FEEDBACK_STATUSES as readonly string[]).includes(s ?? "") ? (s as FeedbackStatus) : null;
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin.feedback");
  const tq = await getTranslations("feedback.q");
  const locale = await getLocale();

  const { data, error } = await supabase.rpc("admin_feedback", { ...(status ? { p_status: status } : {}), p_limit: 100 });
  if (error) throw error;
  const items = (data ?? []) as unknown as Feedback[];

  // Ekran görüntüleri gizli klasörde; 10 dakikalık imzalı bağlantı (yalnızca yöneticiler okuyabilir)
  const paths = items.map((f) => f.screenshot_path).filter((p): p is string => !!p);
  const { data: signed } = paths.length
    ? await supabase.storage.from("feedback").createSignedUrls(paths, 600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlByPath = new Map((signed ?? []).filter((x) => x.path).map((x) => [x.path as string, x.signedUrl]));

  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const filters: (FeedbackStatus | null)[] = [null, ...FEEDBACK_STATUSES];

  return (
    <>
      <PageTitle title={t("title")} hint={t("hint")} />

      <nav className="flex flex-wrap gap-2" aria-label={t("filter")}>
        {filters.map((f) => (
          <Link
            key={f ?? "all"}
            href={f ? `/admin/feedback?s=${f}` : "/admin/feedback"}
            aria-current={f === status ? "page" : undefined}
            className={cn(
              "tap-target-sm inline-flex items-center rounded-full border-2 px-4 text-sm font-semibold",
              f === status ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
            )}
          >
            {f ? t(`status.${f}`) : t("all")}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {items.map((f) => {
            const shot = f.screenshot_path ? urlByPath.get(f.screenshot_path) : undefined;
            return (
              <li key={f.id} className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_1px_3px_oklch(0_0_0/0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{date.format(new Date(f.created_at))}</span>
                  <FeedbackStatusButtons id={f.id} status={f.admin_status} />
                </div>

                {f.would_reuse != null && (
                  <p className="inline-flex items-center gap-2 self-start rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
                    <Star className="size-4" aria-hidden />
                    {t("reuse", { value: f.would_reuse })}
                  </p>
                )}

                <dl className="flex flex-col gap-3">
                  {QUESTIONS.filter((q) => f.answers?.[q]?.trim()).map((q) => (
                    <div key={q} className="flex flex-col gap-0.5">
                      <dt className="text-xs font-semibold text-muted-foreground">{tq(q)}</dt>
                      <dd className="whitespace-pre-wrap">{f.answers[q]}</dd>
                    </div>
                  ))}
                </dl>

                {shot && (
                  <a href={shot} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- imzalı, kısa ömürlü bağlantı */}
                    <img
                      src={shot}
                      alt={t("screenshot")}
                      className="max-h-72 w-auto self-start rounded-xl border border-border object-contain"
                    />
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                      <ExternalLink className="size-3.5" aria-hidden />
                      {t("openScreenshot")}
                    </span>
                  </a>
                )}

                <p className="truncate text-xs text-muted-foreground" title={f.user_agent ?? undefined}>
                  {[f.app_version && `v ${f.app_version.slice(0, 7)}`, f.user_agent].filter(Boolean).join(" · ")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
