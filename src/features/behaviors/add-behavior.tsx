"use client";

import { ArrowLeft, LifeBuoy, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { BehaviorIcon } from "@/components/pause/behavior-icon";
import { ChoiceCard } from "@/components/pause/choice-card";
import { PrimaryButton } from "@/components/pause/primary-button";

import { addBehavior } from "./actions";
import { BEHAVIOR_TEMPLATES, SAFETY_TEMPLATES, type TemplateKey } from "./templates";

type Selection = { kind: "template"; key: TemplateKey } | { kind: "custom" } | null;

export function AddBehavior({ activeTemplates }: { activeTemplates: string[] }) {
  const t = useTranslations("behaviorSettings");
  const tb = useTranslations("behaviors");
  const to = useTranslations("onboarding");
  const tc = useTranslations("common");

  const [selected, setSelected] = useState<Selection>(null);
  const [customName, setCustomName] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const available = BEHAVIOR_TEMPLATES.filter((b) => !activeTemplates.includes(b.key));
  const needsSafety = selected?.kind === "template" && SAFETY_TEMPLATES.includes(selected.key);
  const canSave = selected?.kind === "template" || (selected?.kind === "custom" && customName.trim().length > 0);

  function save() {
    if (!selected) return;
    setError(null);
    start(async () => {
      const result =
        selected.kind === "template"
          ? await addBehavior({ templateKey: selected.key, safetyAcknowledged: needsSafety })
          : await addBehavior({ customName: customName.trim() });
      // Başarılıysa sunucu Ayarlar'a yönlendirir
      if (result && !result.ok) setError(tc("error"));
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex h-14 items-center gap-2">
        <Link
          href="/settings"
          aria-label={tc("back")}
          className="tap-target-sm -ms-3 grid place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-6 rtl:rotate-180" />
        </Link>
        <h1 className="text-xl font-semibold">{t("addTitle")}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-6 py-4">
        <div className="grid grid-cols-2 gap-3" role="radiogroup">
          {available.map((b) => (
            <ChoiceCard
              key={b.key}
              multiple={false}
              label={tb(b.key)}
              icon={<BehaviorIcon name={b.icon} className="size-5" />}
              selected={selected?.kind === "template" && selected.key === b.key}
              onToggle={() => setSelected({ kind: "template", key: b.key })}
            />
          ))}
          <ChoiceCard
            multiple={false}
            label={tb("custom")}
            icon={<Plus className="size-5" />}
            selected={selected?.kind === "custom"}
            onToggle={() => setSelected({ kind: "custom" })}
          />
        </div>

        {selected?.kind === "custom" && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{to("customLabel")}</span>
            <input
              autoFocus
              value={customName}
              maxLength={40}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={to("customPlaceholder")}
              className="tap-target rounded-xl border-2 border-transparent bg-card px-4 outline-none focus:border-primary"
            />
          </label>
        )}

        {/* Alkol / yeme: Onboarding'deki güvenlik notunun aynısı */}
        {needsSafety && selected?.kind === "template" && (
          <aside className="flex flex-col gap-3 rounded-card bg-accent p-5 text-accent-foreground">
            <p className="flex items-center gap-2 font-semibold">
              <LifeBuoy className="size-5 shrink-0" aria-hidden />
              {to("safetyTitle")}
            </p>
            <p className="text-sm">{to("safetyIntro")}</p>
            {selected.key === "alcohol" && <p className="text-sm">{to("safetyAlcohol")}</p>}
            {selected.key === "eating" && <p className="text-sm">{to("safetyEating")}</p>}
            <p className="text-sm font-medium">{to("safetySupport")}</p>
          </aside>
        )}
      </main>

      <footer className="flex flex-col gap-2 pt-2">
        {error && (
          <p role="alert" className="text-center text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <PrimaryButton onClick={save} disabled={!canSave} loading={pending}>
          {needsSafety ? t("ackAndAdd") : t("add")}
        </PrimaryButton>
      </footer>
    </div>
  );
}
