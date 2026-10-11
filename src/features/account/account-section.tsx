"use client";

import { Download, FileSpreadsheet, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { localDb } from "@/lib/offline/db";
import { createClient } from "@/lib/supabase/client";

// Ayarlar > Verilerin: indir (JSON / tablo) ve hesabı kalıcı olarak sil
export function AccountSection() {
  const t = useTranslations("account");
  const locale = useLocale();
  const [stage, setStage] = useState<"idle" | "confirm">("idle");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmWord = t("confirmWord");

  async function deleteAccount() {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    // Bu cihazdaki bildirim aboneliğini de kapat
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      await (await reg?.pushManager.getSubscription())?.unsubscribe();
    } catch {
      // bildirim yoksa sorun değil
    }

    const { error: err } = await supabase.functions.invoke("delete-account", { body: { confirm: "DELETE" } });
    if (err) {
      setBusy(false);
      setError(t("deleteFailed"));
      return;
    }

    // Cihazda kalan her şeyi temizle
    try {
      await localDb.delete();
    } catch {
      // IndexedDB yoksa sorun değil
    }
    try {
      for (const key of Object.keys(localStorage)) if (key.startsWith("pause:")) localStorage.removeItem(key);
    } catch {
      // gizli sekme
    }
    await supabase.auth.signOut().catch(() => undefined);
    window.location.replace("/login?deleted=1");
  }

  return (
    <div className="flex flex-col gap-2">
      <a
        href="/api/export?format=json"
        download
        className="flex items-center gap-3 rounded-xl bg-card p-4 font-semibold transition-colors hover:bg-accent/60"
      >
        <Download className="size-5 text-muted-foreground" aria-hidden />
        <span className="flex flex-col">
          {t("exportJson")}
          <span className="text-sm font-normal text-muted-foreground">{t("exportJsonHint")}</span>
        </span>
      </a>
      <a
        href="/api/export?format=csv"
        download
        className="flex items-center gap-3 rounded-xl bg-card p-4 font-semibold transition-colors hover:bg-accent/60"
      >
        <FileSpreadsheet className="size-5 text-muted-foreground" aria-hidden />
        <span className="flex flex-col">
          {t("exportCsv")}
          <span className="text-sm font-normal text-muted-foreground">{t("exportCsvHint")}</span>
        </span>
      </a>

      {stage === "idle" ? (
        <button
          type="button"
          onClick={() => setStage("confirm")}
          className="tap-target-sm mt-2 inline-flex items-center gap-2 self-start font-semibold text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          {t("delete")}
        </button>
      ) : (
        <div className="mt-2 flex flex-col gap-3 rounded-card border-2 border-destructive/40 bg-card p-4">
          <p className="font-semibold">{t("deleteTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("deleteBody")}</p>
          <label className="flex flex-col gap-2 text-sm">
            {t("typeToConfirm", { word: confirmWord })}
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              className="tap-target rounded-xl border-2 border-transparent bg-muted px-4 text-base outline-none focus:border-destructive"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setStage("idle");
                setTyped("");
              }}
              className="tap-target rounded-xl bg-muted font-semibold"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => void deleteAccount()}
              disabled={busy || typed.trim().toLocaleUpperCase(locale) !== confirmWord.toLocaleUpperCase(locale)}
              className="tap-target rounded-xl bg-destructive font-semibold text-white disabled:opacity-40"
            >
              {busy ? t("deleting") : t("deleteForever")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
