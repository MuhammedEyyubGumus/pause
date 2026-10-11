"use client";

import { BellRing, Share, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { enablePush, getPushState, type PushState } from "./push-client";

const DISMISS_KEY = "pause:notify-prompt-dismissed";
const DISMISS_DAYS = 7;

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// İzin, ilk tamamlanan pause'dan sonra bağlamıyla istenir:
// "Bir dahaki sefere süre dolunca haber vereyim mi?"
export function NotifyPrompt({ hasCompletedPause }: { hasCompletedPause: boolean }) {
  const t = useTranslations("notify");
  const locale = useLocale();
  const [state, setState] = useState<PushState | null>(null);
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hasCompletedPause || dismissedRecently()) return;
    void getPushState().then((s) => {
      setState(s);
      setHidden(!(s === "default" || s === "needs-install"));
    });
  }, [hasCompletedPause]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // gizli sekme vb.: yalnızca bu oturumda gizle
    }
    setHidden(true);
  }

  async function enable() {
    setBusy(true);
    setError(false);
    try {
      const s = await enablePush(locale);
      setState(s);
      if (s === "subscribed" || s === "denied") setHidden(true);
    } catch (e) {
      console.warn(e);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (hidden || !state) return null;

  return (
    <aside className="relative flex flex-col gap-3 rounded-card bg-accent p-5 text-accent-foreground">
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("notNow")}
        className="tap-target-sm absolute end-1 top-1 grid place-items-center rounded-full opacity-60 hover:opacity-100"
      >
        <X className="size-5" />
      </button>

      {state === "needs-install" ? (
        <>
          <p className="flex items-center gap-2 pe-8 font-semibold">
            <Share className="size-5 shrink-0" aria-hidden />
            {t("installTitle")}
          </p>
          <p className="text-sm">{t("installBody")}</p>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 pe-8 font-semibold">
            <BellRing className="size-5 shrink-0" aria-hidden />
            {t("promptTitle")}
          </p>
          <p className="text-sm">{t("promptBody")}</p>
          {error && <p className="text-sm font-medium text-destructive">{t("error")}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void enable()}
              disabled={busy}
              className="tap-target-sm flex-1 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {t("enable")}
            </button>
            <button type="button" onClick={dismiss} className="tap-target-sm rounded-xl px-4 font-semibold">
              {t("notNow")}
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
