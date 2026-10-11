"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { TimerRing } from "@/components/pause/timer-ring";
import { formatClock, usePauseClock } from "@/features/urge-flow/use-pause-clock";
import { findActiveLocalEvent } from "@/lib/offline/sync";

type ActivePause = { id: string; pause_started_at: string | null; pause_ends_at: string | null };

// Ana sayfanın ortası: devam eden bir pause varsa onu, yoksa DÜRTÜ GELDİ butonunu gösterir.
// Pause cihazda olup henüz sunucuya gitmemiş olabilir; bu yüzden cihaz da kontrol edilir.
export function UrgeArea({ userId, serverActive }: { userId: string; serverActive: ActivePause | null }) {
  const [active, setActive] = useState<ActivePause | null>(serverActive);

  useEffect(() => {
    void findActiveLocalEvent(userId).then((local) => {
      if (local) setActive({ id: local.id, pause_started_at: local.row.pause_started_at ?? null, pause_ends_at: local.row.pause_ends_at ?? null });
    });
  }, [userId]);

  return active ? <ActivePauseCard pause={active} /> : <UrgeButton />;
}

function UrgeButton() {
  const t = useTranslations("home");
  return (
    <>
      <div className="relative grid size-64 place-items-center">
        <span className="animate-pulse-soft absolute inset-0 rounded-full bg-primary/10" style={{ animationDelay: "1.2s" }} aria-hidden />
        <span className="animate-pulse-soft absolute inset-5 rounded-full bg-primary/15" aria-hidden />
        <Link
          href="/urge"
          className="relative grid size-48 place-items-center rounded-full bg-primary px-6 text-center text-xl leading-tight font-bold tracking-wide text-primary-foreground shadow-[0_12px_32px_-12px_var(--primary)] transition-transform duration-150 ease-calm active:scale-95"
        >
          {t("urgeButton")}
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">{t("urgeHint")}</p>
    </>
  );
}

function ActivePauseCard({ pause }: { pause: ActivePause }) {
  const t = useTranslations("home");
  const clock = usePauseClock(pause.pause_started_at, pause.pause_ends_at);

  return (
    <Link
      href={`/pause/${pause.id}`}
      className="flex w-full flex-col items-center gap-5 rounded-card bg-pause px-6 py-8 text-center text-pause-foreground transition-transform active:scale-[0.98]"
    >
      <TimerRing progress={clock.progress} label={formatClock(clock.remainingMs)} size={168} />
      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold">{clock.done ? t("pauseEnded") : t("activePause")}</span>
        <span className="text-sm opacity-75">{clock.done ? t("pauseEndedSub") : t("activePauseSub")}</span>
      </div>
      <span className="tap-target inline-flex w-full items-center justify-center rounded-xl bg-pause-foreground font-semibold text-pause">
        {t("activePauseCta")}
      </span>
    </Link>
  );
}
