"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export const FEEDBACK_STATUSES = ["new", "read", "done"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

// Geri bildirimi "yeni / okundu / tamamlandı" olarak işaretle
export function FeedbackStatusButtons({ id, status }: { id: string; status: FeedbackStatus }) {
  const t = useTranslations("admin.feedback.status");
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);

  function set(next: FeedbackStatus) {
    if (next === current) return;
    setError(false);
    const before = current;
    setCurrent(next);
    start(async () => {
      const { error: err } = await createClient().rpc("admin_set_feedback_status", { p_id: id, p_status: next });
      if (err) {
        setCurrent(before);
        setError(true);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-busy={pending || undefined}>
      {FEEDBACK_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={current === s}
          onClick={() => set(s)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            current === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {t(s)}
        </button>
      ))}
      {error && <span className="text-xs text-destructive">!</span>}
    </div>
  );
}
