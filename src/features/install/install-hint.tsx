"use client";

import { Check, Copy, Download, Share, SquarePlus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";

import { isIos, isStandalone } from "@/features/notifications/push-client";

const DISMISS_KEY = "pause:install-hint-dismissed";
const DISMISS_DAYS = 14;

// Android/Chrome'un kendi yükleme penceresi (standart tiplerde yok)
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

type Mode = "ios-safari" | "ios-other" | "android";

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// iPhone'da Chrome, Firefox, Edge ya da uygulama içi tarayıcılardan ana ekrana eklenemez
function isIosSafari() {
  const ua = navigator.userAgent;
  return !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV|Line\//.test(ua);
}

// Uygulama tarayıcıda açıldıysa ve henüz ana ekranda değilse: nasıl ekleneceğini gösterir.
// Ana ekrandan açıldığında, masaüstünde ya da kapatıldıktan sonra 14 gün görünmez.
export function InstallHint({ context = "home" }: { context?: "home" | "login" }) {
  const t = useTranslations("install");
  const [mode, setMode] = useState<Mode | null>(null);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return;
    if (isIos()) {
      setMode(isIosSafari() ? "ios-safari" : "ios-other");
      return;
    }
    // Android: Chrome yüklenebilir olduğunu bildirince düğme göster
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
      setMode("android");
    };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // gizli sekme: yalnızca bu açılışta gizle
    }
    setMode(null);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === "accepted") setMode(null);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // panoya erişim yoksa kullanıcı adresi kendisi kopyalar
    }
  }

  return (
    <AnimatePresence>
      {mode && (
        <motion.aside
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          className="relative flex flex-col gap-3 overflow-hidden rounded-card border-2 border-primary/30 bg-accent p-4 text-accent-foreground"
          aria-label={t("title")}
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("dismiss")}
            className="tap-target-sm absolute end-1 top-1 grid place-items-center rounded-full opacity-70 hover:opacity-100"
          >
            <X className="size-5" aria-hidden />
          </button>

          <div className="flex items-center gap-3 pe-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- yerel uygulama ikonu */}
            <img src="/icons/apple-touch-icon.png" alt="" className="size-11 shrink-0 rounded-xl shadow-sm" />
            <div className="flex flex-col">
              <span className="font-semibold">{t("title")}</span>
              <span className="text-sm opacity-80">{t(context === "login" ? "subLogin" : "sub")}</span>
            </div>
          </div>

          {mode === "ios-safari" && (
            <ol className="flex flex-col gap-2 text-sm">
              <Step n={1}>
                {t.rich("iosStep1", { icon: () => <Inline><Share className="size-4" aria-label={t("share")} /></Inline> })}
              </Step>
              <Step n={2}>
                {t.rich("iosStep2", { icon: () => <Inline><SquarePlus className="size-4" aria-hidden /></Inline> })}
              </Step>
              <Step n={3}>{t("iosStep3")}</Step>
            </ol>
          )}

          {mode === "ios-other" && (
            <div className="flex flex-col gap-2 text-sm">
              <p>{t("iosOther")}</p>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="tap-target-sm inline-flex items-center gap-1.5 self-start rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
              >
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copied ? t("copied") : t("copyLink")}
              </button>
            </div>
          )}

          {mode === "android" && (
            <button
              type="button"
              onClick={() => void install()}
              className="tap-target-sm inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
            >
              <Download className="size-5" aria-hidden />
              {t("androidInstall")}
            </button>
          )}

          {mode !== "android" && <p className="text-xs opacity-75">{t("loginNote")}</p>}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="numeric grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

function Inline({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-grid size-6 place-items-center rounded-md bg-card align-middle text-primary shadow-sm">
      {children}
    </span>
  );
}
