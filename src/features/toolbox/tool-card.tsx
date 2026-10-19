"use client";

import { EyeOff, Eye, MoreHorizontal, NotebookPen, Pin, PinOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { OptionIcon } from "@/features/urge-flow/option-visuals";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import type { ToolStatus } from "./shared";

type Props = {
  userId: string;
  optionId: string;
  optionKey: string | null;
  label: string;
  status: ToolStatus;
  badge: string;
  lines: string[]; // sunucuda hazırlanan istatistik satırları
  progress: number | null; // öğrenme aşamasında ölçüm ilerlemesi (0..1)
  pinned: boolean;
  hidden: boolean;
  note: string | null;
};

const BADGE: Record<ToolStatus, string> = {
  works: "bg-primary text-primary-foreground",
  learning: "bg-accent text-accent-foreground",
  new: "bg-muted text-muted-foreground",
  weak: "bg-muted text-muted-foreground",
};

// Araç kutusundaki tek alternatif: istatistik, sabitle, gizle, kendine not
export function ToolCard(props: Props) {
  const t = useTranslations("toolbox");
  const router = useRouter();
  const [pinned, setPinned] = useState(props.pinned);
  const [hidden, setHidden] = useState(props.hidden);
  const [note, setNote] = useState(props.note ?? "");
  const [draft, setDraft] = useState(props.note ?? "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function save(next: { pinned: boolean; hidden: boolean; note: string }) {
    setBusy(true);
    setError(false);
    const { error: err } = await createClient()
      .from("toolbox_items")
      .upsert(
        {
          user_id: props.userId,
          option_id: props.optionId,
          pinned: next.pinned,
          hidden: next.hidden,
          note: next.note.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,option_id" },
      );
    setBusy(false);
    if (err) {
      setError(true);
      return false;
    }
    setPinned(next.pinned);
    setHidden(next.hidden);
    setNote(next.note.trim());
    router.refresh();
    return true;
  }

  return (
    <li className={cn("flex flex-col gap-3 rounded-card bg-card p-4 shadow-[0_1px_2px_oklch(0_0_0/0.04)]", hidden && "opacity-70")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full",
            props.status === "works" || pinned ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          <OptionIcon option={{ kind: "intervention", key: props.optionKey }} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{props.label}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", BADGE[props.status])}>{props.badge}</span>
          </span>
          {props.lines.map((line) => (
            <span key={line} className="text-sm text-muted-foreground">
              {line}
            </span>
          ))}
          {props.progress != null && (
            <span className="mt-1 h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(props.progress * 100)}%` }} />
            </span>
          )}
        </div>
        {!hidden && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            disabled={busy}
            onClick={() => void save({ pinned: !pinned, hidden: false, note })}
            aria-pressed={pinned}
            aria-label={pinned ? t("unpin") : t("pin")}
            title={pinned ? t("unpin") : t("pin")}
            className={cn(
              "tap-target-sm -me-2 grid shrink-0 place-items-center rounded-full transition-colors",
              pinned ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {pinned ? <Pin className="size-5 fill-current" aria-hidden /> : <Pin className="size-5" aria-hidden />}
          </motion.button>
        )}
      </div>

      {note && !open && (
        <p className="flex gap-1.5 rounded-xl bg-accent/60 px-3 py-2 text-sm text-accent-foreground">
          <NotebookPen className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{note}</span>
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap-target-sm -my-1 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal className="size-4" aria-hidden />
        {t("more")}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-3 overflow-hidden"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">{t("note")}</span>
              <textarea
                value={draft}
                maxLength={140}
                rows={2}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("notePlaceholder")}
                className="w-full resize-none rounded-xl border-2 border-transparent bg-muted/60 p-3 outline-none focus:border-primary"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || draft.trim() === note}
                onClick={async () => {
                  if (await save({ pinned, hidden, note: draft })) setOpen(false);
                }}
                className="tap-target-sm rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-40"
              >
                {t("save")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save({ pinned: false, hidden: !hidden, note })}
                className="tap-target-sm inline-flex items-center gap-1.5 rounded-xl px-3 font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {hidden ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
                {hidden ? t("unhide") : t("hide")}
              </button>
              {pinned && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save({ pinned: false, hidden, note })}
                  className="tap-target-sm inline-flex items-center gap-1.5 rounded-xl px-3 font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <PinOff className="size-4" aria-hidden />
                  {t("unpin")}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {t("error")}
        </p>
      )}
    </li>
  );
}
