"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

// Deneyi süresinden önce bitir (iki adımlı: önce onay)
export function EndExperimentButton({ id }: { id: string }) {
  const t = useTranslations("experiment");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function end() {
    setBusy(true);
    setError(false);
    const { error: err } = await createClient()
      .from("experiments")
      .update({ status: "abandoned", ended_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(false);
    if (err) {
      setError(true);
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="tap-target-sm self-center text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        {t("end")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-card bg-card p-4">
      <p className="text-center text-sm">{t("endConfirm")}</p>
      {error && <p className="text-center text-sm font-medium text-destructive">{t("saveError")}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setConfirming(false)} className="tap-target rounded-xl bg-muted font-semibold">
          {t("keep")}
        </button>
        <button
          type="button"
          onClick={() => void end()}
          disabled={busy}
          className="tap-target rounded-xl bg-foreground font-semibold text-background disabled:opacity-50"
        >
          {t("endYes")}
        </button>
      </div>
    </div>
  );
}
