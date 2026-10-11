import { ArrowLeft, ChevronRight, LogOut, MessageSquareText, Plus } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { BehaviorIcon } from "@/components/pause/behavior-icon";
import { AccountSection } from "@/features/account/account-section";
import { AnalyticsSetting } from "@/features/settings/analytics-setting";
import { isTemplateKey } from "@/features/behaviors/templates";
import { NotificationSetting } from "@/features/notifications/notification-setting";
import { setDisplayName, setLocale, signOut } from "@/features/settings/actions";
import { LOCALES } from "@/i18n/config";
import { requireOnboardedUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const LOCALE_NAMES: Record<string, string> = { tr: "Türkçe", en: "English" };

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireOnboardedUser();
  const t = await getTranslations("settings");
  const tb = await getTranslations("behaviors");
  const locale = await getLocale();

  const { data: behaviors } = await supabase
    .from("behaviors")
    .select("id, name, icon, template_key, pause_minutes")
    .is("archived_at", null)
    .order("sort_order");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-4 pt-safe pb-safe">
      <header className="flex h-14 items-center gap-2">
        <Link
          href="/"
          aria-label={t("back")}
          className="tap-target-sm -ms-3 grid place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-6 rtl:rotate-180" />
        </Link>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("behaviors")}</h2>
        <ul className="flex flex-col gap-2">
          {behaviors?.map((b) => (
            <li key={b.id}>
              <Link
                href={`/settings/behaviors/${b.id}`}
                className="flex items-center gap-3 rounded-xl bg-card p-4 transition-colors hover:bg-accent/60"
              >
                <span className="grid size-10 place-items-center rounded-full bg-muted">
                  <BehaviorIcon name={b.icon} className="size-5" />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="font-semibold">{isTemplateKey(b.template_key) ? tb(b.template_key) : b.name}</span>
                  <span className="text-sm text-muted-foreground">{t("pauseLength", { minutes: b.pause_minutes })}</span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/settings/behaviors/new"
              className="tap-target flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border font-semibold text-primary transition-colors hover:bg-accent/60"
            >
              <Plus className="size-5" aria-hidden />
              {t("addBehavior")}
            </Link>
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("name")}</h2>
        <form action={setDisplayName} className="flex gap-2">
          <input
            name="displayName"
            defaultValue={profile.display_name ?? ""}
            maxLength={60}
            autoComplete="given-name"
            placeholder={t("namePlaceholder")}
            className="tap-target min-w-0 flex-1 rounded-xl border-2 border-transparent bg-card px-4 outline-none focus:border-primary"
          />
          <button className="tap-target rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
            {t("save")}
          </button>
        </form>
        <p className="text-sm text-muted-foreground">{t("nameHint")}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("notifications")}</h2>
        <NotificationSetting />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("language")}</h2>
        <form action={setLocale} className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          {LOCALES.map((l) => (
            <button
              key={l}
              name="locale"
              value={l}
              aria-pressed={l === locale}
              className={cn(
                "tap-target-sm rounded-lg font-semibold transition-colors",
                l === locale ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {LOCALE_NAMES[l] ?? l}
            </button>
          ))}
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("testGroup")}</h2>
        <Link
          href="/settings/feedback"
          className="flex items-center gap-3 rounded-xl bg-card p-4 transition-colors hover:bg-accent/60"
        >
          <span className="grid size-10 place-items-center rounded-full bg-muted">
            <MessageSquareText className="size-5" aria-hidden />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">{t("feedback")}</span>
            <span className="text-sm text-muted-foreground">{t("feedbackHint")}</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" aria-hidden />
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("yourData")}</h2>
        <AccountSection />
        <AnalyticsSetting />
      </section>

      <section className="mt-auto flex flex-col gap-2">
        <p className="text-center text-sm text-muted-foreground">
          {user.email} ·{" "}
          <Link href="/privacy" className="font-semibold underline-offset-4 hover:underline">
            {t("privacy")}
          </Link>
        </p>
        <form action={signOut}>
          <button className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl font-semibold text-muted-foreground hover:text-foreground">
            <LogOut className="size-5" aria-hidden />
            {t("signOut")}
          </button>
        </form>
      </section>
    </div>
  );
}
