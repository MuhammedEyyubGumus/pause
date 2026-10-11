"use client";

import { ArrowLeft, Check, ImagePlus, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { PrimaryButton } from "@/components/pause/primary-button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { uuid } from "@/lib/uuid";

// Brief'teki 6 soru. Cevaplar answers jsonb alanına bu anahtarlarla yazılır.
const QUESTIONS = ["hard", "unclear", "unnecessary", "helpful", "wish"] as const;
const MAX_IMAGE = 5 * 1024 * 1024;

export function FeedbackForm({ userId }: { userId: string }) {
  const t = useTranslations("feedback");
  const tc = useTranslations("common");

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const hasContent = score != null || QUESTIONS.some((q) => answers[q]?.trim());

  async function submit() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const id = uuid();

    let screenshot_path: string | null = null;
    if (file) {
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
      screenshot_path = `${userId}/${id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("feedback")
        .upload(screenshot_path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setBusy(false);
        setError(t("uploadFailed"));
        return;
      }
    }

    const cleaned = Object.fromEntries(
      QUESTIONS.map((q) => [q, answers[q]?.trim() ?? ""]).filter(([, v]) => v),
    );
    const { error: err } = await supabase.from("feedback").insert({
      id,
      answers: { ...cleaned, screen: "settings" },
      would_reuse: score,
      screenshot_path,
      app_version: (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "dev").slice(0, 12),
      user_agent: navigator.userAgent.slice(0, 300),
    });
    setBusy(false);
    if (err) {
      setError(tc("error"));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-6 text-center pt-safe pb-safe">
        <span className="grid size-16 place-items-center rounded-full bg-accent text-accent-foreground">
          <Check className="size-8" aria-hidden />
        </span>
        <h1 className="text-question">{t("thanksTitle")}</h1>
        <p className="max-w-xs text-muted-foreground">{t("thanksBody")}</p>
        <Link href="/settings" className="tap-target inline-flex items-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground">
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex h-14 items-center gap-2">
        <Link
          href="/settings"
          aria-label={tc("back")}
          className="tap-target-sm -ms-3 grid place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-6 rtl:rotate-180" />
        </Link>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-7 py-4">
        <p className="text-muted-foreground">{t("intro")}</p>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">{t("reuse")}</h2>
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={t("reuse")}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={score === n}
                onClick={() => setScore(score === n ? null : n)}
                className={cn(
                  "tap-target-sm numeric rounded-xl border-2 font-semibold transition-colors",
                  score === n ? "border-primary bg-accent text-accent-foreground" : "border-transparent bg-card",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("reuseLow")}</span>
            <span>{t("reuseHigh")}</span>
          </div>
        </section>

        {QUESTIONS.map((q) => (
          <label key={q} className="flex flex-col gap-2">
            <span className="font-semibold">{t(`q.${q}`)}</span>
            <textarea
              value={answers[q] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q]: e.target.value }))}
              maxLength={1500}
              rows={3}
              className="w-full resize-none rounded-xl border-2 border-transparent bg-card p-4 outline-none focus:border-primary"
            />
          </label>
        ))}

        <section className="flex flex-col gap-2">
          <span className="font-semibold">{t("screenshot")}</span>
          {file ? (
            <div className="flex items-center gap-3 rounded-xl bg-card p-3">
              <ImagePlus className="size-5 text-muted-foreground" aria-hidden />
              <span className="flex-1 truncate text-sm">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label={t("removeScreenshot")} className="tap-target-sm grid place-items-center">
                <X className="size-5" />
              </button>
            </div>
          ) : (
            <label className="tap-target flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border font-semibold text-primary">
              <ImagePlus className="size-5" aria-hidden />
              {t("addScreenshot")}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > MAX_IMAGE) {
                    setError(t("tooLarge"));
                    return;
                  }
                  setError(null);
                  setFile(f);
                }}
              />
            </label>
          )}
          <p className="text-xs text-muted-foreground">{t("screenshotHint")}</p>
        </section>
      </main>

      <footer className="sticky bottom-0 flex flex-col gap-2 bg-background/90 pt-2 pb-safe backdrop-blur">
        {error && (
          <p role="alert" className="text-center text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <PrimaryButton onClick={() => void submit()} loading={busy} disabled={!hasContent}>
          {t("send")}
        </PrimaryButton>
      </footer>
    </div>
  );
}
