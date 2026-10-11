"use client";

import { Bell, BellOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { disablePush, enablePush, getPushState, type PushState } from "./push-client";

// Ayarlar'daki "Süre dolunca bildirim" satırı
export function NotificationSetting() {
  const t = useTranslations("notify");
  const locale = useLocale();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    void getPushState().then(setState);
  }, []);

  async function toggle() {
    setBusy(true);
    setError(false);
    try {
      setState(state === "subscribed" ? await disablePush() : await enablePush(locale));
    } catch (e) {
      console.warn(e);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (!state) return <div className="h-16 rounded-xl bg-card" />;

  const on = state === "subscribed";
  const canToggle = state === "subscribed" || state === "default";

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-muted">
          {on ? <Bell className="size-5" aria-hidden /> : <BellOff className="size-5" aria-hidden />}
        </span>
        <span className="flex flex-1 flex-col">
          <span className="font-semibold">{t("settingTitle")}</span>
          <span className="text-sm text-muted-foreground">{t(`state.${state}`)}</span>
        </span>
        {canToggle && (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={t("settingTitle")}
            disabled={busy}
            onClick={() => void toggle()}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-primary" : "bg-border"}`}
          >
            <span
              className={`absolute top-1 size-6 rounded-full bg-card shadow transition-[inset-inline-start] duration-200 ${on ? "start-7" : "start-1"}`}
            />
          </button>
        )}
      </div>
      {error && <p className="text-sm font-medium text-destructive">{t("error")}</p>}
    </div>
  );
}
