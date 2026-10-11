"use client";

import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ChoiceCard } from "@/components/pause/choice-card";

import { OptionIcon, useOptionLabel } from "./option-visuals";
import type { FlowOption } from "./types";

type Props = {
  options: FlowOption[];
  selected: string[];
  onToggle: (id: string) => void;
  multiple?: boolean;
  // Kullanıcının kendi seçeneğini eklemesi (sunucuya yazılır)
  onAdd?: (label: string) => Promise<boolean>;
};

export function OptionGrid({ options, selected, onToggle, multiple = true, onAdd }: Props) {
  const t = useTranslations("urge");
  const label = useOptionLabel();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit() {
    if (!onAdd || !draft.trim()) return;
    setBusy(true);
    setError(false);
    const ok = await onAdd(draft.trim());
    setBusy(false);
    if (ok) {
      setDraft("");
      setAdding(false);
    } else {
      setError(true);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3" role={multiple ? "group" : "radiogroup"}>
        {options.map((o) => (
          <ChoiceCard
            key={o.id}
            label={label(o)}
            icon={<OptionIcon option={o} className="size-5" />}
            selected={selected.includes(o.id)}
            onToggle={() => onToggle(o.id)}
            multiple={multiple}
          />
        ))}
        {onAdd && !adding && (
          <ChoiceCard
            label={t("addOwn")}
            icon={<Plus className="size-5" />}
            selected={false}
            onToggle={() => setAdding(true)}
          />
        )}
      </div>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="flex flex-col gap-2 overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                autoFocus
                value={draft}
                maxLength={40}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("addOwnPlaceholder")}
                className="tap-target min-w-0 flex-1 rounded-xl border-2 border-transparent bg-card px-4 outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="tap-target rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-40"
              >
                {t("add")}
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{t("addFailed")}</p>}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
