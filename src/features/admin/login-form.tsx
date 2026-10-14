"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import { BrandMark } from "@/components/pause/brand";
import { PrimaryButton } from "@/components/pause/primary-button";
import { createClient } from "@/lib/supabase/client";

// Yönetici girişi: e-posta + şifre (yönetici hesabı gerçek bir posta kutusu olmayabilir,
// bu yüzden kodla değil şifreyle girilir). Şifre Supabase'de saklanır, kodda yoktur.
export function AdminLoginForm() {
  const t = useTranslations("admin.login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (err || !data.user) {
      setPending(false);
      setError(err?.status === 429 ? t("rateLimit") : t("invalid"));
      return;
    }
    // Yönetici olmayan bir hesapla girildiyse oturumu hemen kapat
    if (data.user.app_metadata?.role !== "admin") {
      await supabase.auth.signOut();
      setPending(false);
      setError(t("notAdmin"));
      return;
    }
    window.location.replace("/admin");
  }

  return (
    <form onSubmit={submit} className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-4 pt-safe pb-safe" noValidate>
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark size="lg" />
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{t("email")}</span>
          <input
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="tap-target rounded-xl border-2 border-border bg-card px-4 outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{t("password")}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="tap-target rounded-xl border-2 border-border bg-card px-4 outline-none focus:border-primary"
          />
        </label>
        <p role="alert" aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">
          {error}
        </p>
      </div>

      <PrimaryButton type="submit" loading={pending} disabled={!email.trim() || !password}>
        {pending ? t("signingIn") : t("signIn")}
      </PrimaryButton>
    </form>
  );
}
