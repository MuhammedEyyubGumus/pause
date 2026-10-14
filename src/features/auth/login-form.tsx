"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/pause/brand";
import { PrimaryButton } from "@/components/pause/primary-button";
import { createClient } from "@/lib/supabase/client";

// Supabase > Authentication > Providers > Email > "Email OTP Length" ile aynı olmalı
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = "email" | "code";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const supabase = useRef(createClient()).current;

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "link" ? t("linkFailed") : null,
  );
  const accountDeleted = searchParams.get("deleted") === "1";
  const [cooldown, setCooldown] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeInput.current?.focus();
  }, [step]);

  // Kullanıcı e-postadaki bağlantıyı başka bir sekmede açıp giriş yaptıysa,
  // bu sekmeye döndüğünde oturumu fark et ve ana sayfaya geç.
  useEffect(() => {
    if (step !== "code") return;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/");
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [step, supabase, router]);

  async function sendCode() {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setError(t("invalidEmail"));
      return;
    }
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        shouldCreateUser: true,
        // Varsayılan Supabase e-postası bağlantı içerir; bağlantı bu adrese döner.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setPending(false);

    if (err) {
      setError(err.status === 429 ? t("rateLimit") : err.message);
      return;
    }
    setEmail(normalized);
    setCode("");
    setCooldown(RESEND_SECONDS);
    setStep("code");
  }

  async function verify(token: string) {
    if (token.length !== OTP_LENGTH || pending) return;
    setPending(true);
    setError(null);
    // İlk girişte Supabase "Confirm signup" şablonunu gönderir; bazı proje ayarlarında
    // bu kod "signup" türüyle doğrulanır. Önce "email", olmazsa "signup" denenir.
    let { error: err } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (err && err.status !== 429) {
      ({ error: err } = await supabase.auth.verifyOtp({ email, token, type: "signup" }));
    }

    if (err) {
      setPending(false);
      setCode("");
      setError(err.status === 429 ? t("rateLimit") : t("invalidCode"));
      codeInput.current?.focus();
      return;
    }
    // Oturum çerezleri yazıldı; sunucu tarafı yönlendirmeyi (onboarding / ana sayfa) yapar.
    router.replace("/");
    router.refresh();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === "email") void sendCode();
    else void verify(code);
  }

  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
      };

  return (
    <form onSubmit={onSubmit} className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe" noValidate>
      <header className="flex h-16 items-center justify-center">
        <BrandMark size="lg" />
      </header>

      <main className="flex flex-1 flex-col justify-center gap-8 py-8">
        <AnimatePresence mode="wait" initial={false}>
          {step === "email" ? (
            <motion.div key="email" {...slide} transition={{ duration: 0.25 }} className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <p className="text-muted-foreground">{t("tagline")}</p>
                <h1 className="text-question">{t("emailTitle")}</h1>
              </div>

              <label className="flex flex-col gap-2">
                <span className="sr-only">{t("emailLabel")}</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  aria-invalid={!!error || undefined}
                  className="tap-target w-full rounded-xl border-2 border-transparent bg-card px-4 text-lg shadow-[0_1px_2px_oklch(0_0_0/0.04)] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
                />
              </label>

              {accountDeleted && (
                <p role="status" className="rounded-xl bg-muted p-4 text-sm font-medium">
                  {t("accountDeleted")}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{t("noPassword")}</p>
            </motion.div>
          ) : (
            <motion.div key="code" {...slide} transition={{ duration: 0.25 }} className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <h1 className="text-question">{t("codeTitle")}</h1>
                <p className="text-muted-foreground">{t("codeHint", { email, length: OTP_LENGTH })}</p>
              </div>

              <label className="flex flex-col gap-2">
                <span className="sr-only">{t("codeLabel")}</span>
                <input
                  ref={codeInput}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={OTP_LENGTH}
                  value={code}
                  disabled={pending}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH);
                    setCode(digits);
                    if (digits.length === OTP_LENGTH) void verify(digits);
                  }}
                  aria-invalid={!!error || undefined}
                  className="numeric h-20 w-full rounded-xl border-2 border-transparent bg-card text-center text-4xl font-semibold tracking-[0.4em] shadow-[0_1px_2px_oklch(0_0_0/0.04)] outline-none transition-colors focus:border-primary disabled:opacity-60"
                />
              </label>

              <div className="flex flex-col items-start gap-1 text-sm">
                <button
                  type="button"
                  disabled={cooldown > 0 || pending}
                  onClick={() => void sendCode()}
                  className="tap-target-sm font-semibold text-primary disabled:font-normal disabled:text-muted-foreground"
                >
                  {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resend")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError(null);
                  }}
                  className="tap-target-sm text-muted-foreground hover:text-foreground"
                >
                  {t("changeEmail")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p role="alert" aria-live="polite" className="min-h-6 text-sm font-medium text-destructive">
          {error}
        </p>
      </main>

      <footer className="pt-2">
        <PrimaryButton type="submit" loading={pending} disabled={step === "code" && code.length !== OTP_LENGTH}>
          {step === "email"
            ? pending
              ? t("sending")
              : t("sendCode")
            : pending
              ? t("verifying")
              : t("verify")}
        </PrimaryButton>
        <p className="pt-3 text-center text-xs text-muted-foreground">
          <a href="/privacy" className="underline-offset-4 hover:underline">
            {t("privacy")}
          </a>
        </p>
      </footer>
    </form>
  );
}
