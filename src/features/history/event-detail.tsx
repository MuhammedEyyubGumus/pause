"use client";

import { ArrowLeft, CircleCheck, CircleSlash, LifeBuoy, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type CSSProperties, type ReactNode, useState } from "react";

import { BehaviorIcon } from "@/components/pause/behavior-icon";
import { ChoiceCard } from "@/components/pause/choice-card";
import { PrimaryButton } from "@/components/pause/primary-button";
import { OptionGrid } from "@/features/urge-flow/option-grid";
import { OptionIcon, useOptionLabel } from "@/features/urge-flow/option-visuals";
import { questionsFor } from "@/features/urge-flow/questions";
import { type FlowBehavior, type FlowOption, optionFitsBehavior } from "@/features/urge-flow/types";
import { type LocalEvent, localDb } from "@/lib/offline/db";
import { syncPending } from "@/lib/offline/sync";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/time/format";
import { cn } from "@/lib/utils";

import { behaviorLabel } from "./labels";

type Props = {
  event: LocalEvent;
  title: string;
  behaviors: FlowBehavior[]; // aktif davranışlar (düzenlemede seçilebilir)
  allBehaviors: FlowBehavior[]; // arşivlenmişler dahil (ad göstermek için)
  options: FlowOption[];
};

export function EventDetail({ event, title, behaviors, allBehaviors, options }: Props) {
  const t = useTranslations("history");
  const tu = useTranslations("urge");
  const tb = useTranslations("behaviors");
  const label = useOptionLabel();
  const router = useRouter();

  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const r = event.row;
  const behavior = allBehaviors.find((b) => b.id === r.behavior_id);
  const byId = new Map(options.map((o) => [o.id, o]));
  const outcome = r.outcome_option_id ? byId.get(r.outcome_option_id) : undefined;
  const questions = questionsFor(behavior?.template_key);

  async function remove() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("urge_events").delete().eq("id", event.id);
    if (err) {
      setBusy(false);
      setError(t("offlineError"));
      return;
    }
    // Cihazdaki kopya da silinmeli; yoksa senkron onu geri yazar
    await localDb.events.delete(event.id);
    router.replace("/history");
    router.refresh();
  }

  if (mode === "edit") {
    return (
      <EventEditor
        event={event}
        behaviors={behaviors}
        options={options}
        onCancel={() => setMode("view")}
        onSaved={() => {
          setMode("view");
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex h-14 items-center gap-2">
        <Link
          href="/history"
          aria-label={t("title")}
          className="tap-target-sm -ms-3 grid place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-6 rtl:rotate-180" />
        </Link>
        <h1 className="truncate text-base font-semibold">{title}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-4 py-4">
        {/* Özet */}
        <section className="flex flex-col items-center gap-4 rounded-card bg-card px-6 py-8 text-center">
          <span className="inline-flex items-center gap-2 font-semibold">
            <BehaviorIcon name={behavior?.icon} className="size-5" />
            {behaviorLabel(behavior, tb)}
          </span>
          {r.urge_before != null ? (
            <div className="flex items-baseline gap-3">
              <span className={cn("numeric font-bold", r.urge_after != null ? "text-4xl text-muted-foreground" : "text-6xl")}>
                {r.urge_before}
              </span>
              {r.urge_after != null && (
                <>
                  <span className="text-xl text-muted-foreground">→</span>
                  <span className="numeric text-6xl font-bold">{r.urge_after}</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{t("noIntensity")}</span>
          )}
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {r.emergency_mode && (
              <Badge>
                <LifeBuoy className="size-3.5 text-urge-high" aria-hidden /> {t("sos")}
              </Badge>
            )}
            {r.source === "retro" && <Badge>{t("retro")}</Badge>}
            {r.pause_minutes && r.pause_status !== "none" && <Badge>{t("pauseMinutes", { minutes: r.pause_minutes })}</Badge>}
          </div>
        </section>

        <Section title={t("outcome")}>
          <p className="font-semibold">{outcome ? label(outcome) : t("noOutcome")}</p>
        </Section>

        {event.emotions.length > 0 && (
          <Section title={t("emotions")}>
            <Chips ids={event.emotions} byId={byId} />
          </Section>
        )}

        {event.triggers.length > 0 && (
          <Section title={t("triggers")}>
            <Chips ids={event.triggers} byId={byId} />
          </Section>
        )}

        {event.interventions.length > 0 && (
          <Section title={t("tried")}>
            <ul className="flex flex-col gap-3">
              {[...event.interventions]
                .sort((a, b) => a.position - b.position)
                .map((iv) => {
                  const o = byId.get(iv.option_id);
                  const ms = iv.ended_at ? Date.parse(iv.ended_at) - Date.parse(iv.started_at) : null;
                  return (
                    <li key={iv.id} className="flex items-center gap-3">
                      {o && <OptionIcon option={o} className="size-5 shrink-0 text-muted-foreground" />}
                      <span className="flex-1 font-medium">{o ? label(o) : "—"}</span>
                      {ms != null && <span className="numeric text-sm text-muted-foreground">{formatDuration(ms)}</span>}
                      {iv.completed ? (
                        <CircleCheck className="size-5 text-change-positive" aria-label={t("completed")} />
                      ) : (
                        <CircleSlash className="size-5 text-muted-foreground" aria-label={t("notCompleted")} />
                      )}
                    </li>
                  );
                })}
            </ul>
          </Section>
        )}

        {questions.map((q) => {
          const a = event.answers.find((x) => x.question_key === q.key);
          return a?.value_num != null ? (
            <Section key={q.key} title={tu(q.titleKey)}>
              <p className="numeric font-semibold">{a.value_num} / 10</p>
            </Section>
          ) : null;
        })}

        {r.notes && (
          <Section title={t("notes")}>
            <p className="whitespace-pre-wrap">{r.notes}</p>
          </Section>
        )}
      </main>

      <footer className="flex flex-col gap-2 pt-2">
        {error && (
          <p role="alert" className="text-center text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        {mode === "confirmDelete" ? (
          <div className="flex flex-col gap-3 rounded-card bg-card p-4">
            <p className="text-center font-medium">{t("deleteConfirm")}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMode("view")} className="tap-target rounded-xl bg-muted font-semibold">
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy}
                className="tap-target rounded-xl bg-destructive font-semibold text-white disabled:opacity-50"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <PrimaryButton onClick={() => setMode("edit")} disabled={r.pause_status === "active"}>
              <Pencil className="size-5" aria-hidden /> {t("edit")}
            </PrimaryButton>
            {r.pause_status === "active" && (
              <Link href={`/pause/${event.id}`} className="tap-target-sm text-center text-sm font-semibold text-primary">
                {t("continuePause")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMode("confirmDelete")}
              className="tap-target-sm inline-flex items-center justify-center gap-2 font-semibold text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden /> {t("delete")}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-card bg-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-medium">{children}</span>;
}

function Chips({ ids, byId }: { ids: string[]; byId: Map<string, FlowOption> }) {
  const label = useOptionLabel();
  return (
    <ul className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const o = byId.get(id);
        if (!o) return null;
        return (
          <li key={id} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground">
            <OptionIcon option={o} className="size-4" />
            {label(o)}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Düzenleme: tek kaydırılan form. Akışın aksine burası sakin bir "gözden geçirme"
// anı olduğu için tüm alanlar bir arada.
// ---------------------------------------------------------------------------
function EventEditor({
  event,
  behaviors,
  options,
  onCancel,
  onSaved,
}: {
  event: LocalEvent;
  behaviors: FlowBehavior[];
  options: FlowOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("history");
  const tu = useTranslations("urge");
  const tb = useTranslations("behaviors");
  const label = useOptionLabel();

  const r = event.row;
  const [behaviorId, setBehaviorId] = useState(r.behavior_id);
  const [before, setBefore] = useState<number | null>(r.urge_before ?? null);
  const [after, setAfter] = useState<number | null>(r.urge_after ?? null);
  const [emotions, setEmotions] = useState(event.emotions);
  const [triggers, setTriggers] = useState(event.triggers);
  const [outcomeId, setOutcomeId] = useState<string | null>(r.outcome_option_id ?? null);
  const [notes, setNotes] = useState(r.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const behavior = behaviors.find((b) => b.id === behaviorId);
  const ofKind = (kind: FlowOption["kind"]) =>
    options.filter((o) => o.kind === kind && optionFitsBehavior(o, behavior)).sort((a, b) => a.sort_order - b.sort_order);
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  async function save() {
    setBusy(true);
    setError(null);
    // Önce cihazda bekleyen değişiklikler gitsin; sonra düzenleme üzerine yazılır
    await syncPending();

    const supabase = createClient();
    const now = new Date().toISOString();
    const { error: e1 } = await supabase
      .from("urge_events")
      .update({
        behavior_id: behaviorId,
        urge_before: before,
        urge_after: after,
        notes: notes.trim() || null,
        outcome_option_id: outcomeId,
        // Sonuç kaldırılırsa sınıfı da temizlenmeli (tetikleyici yalnızca doluyken çalışır)
        ...(outcomeId ? {} : { outcome_class: null }),
        ...(after != null && !r.remeasured_at ? { remeasured_at: now } : {}),
        ...(outcomeId && r.pause_status === "active" ? { pause_status: "completed" as const, pause_completed_at: now } : {}),
      })
      .eq("id", event.id);

    const replace = async (table: "event_emotions" | "event_triggers", ids: string[]) => {
      const del = await supabase.from(table).delete().eq("event_id", event.id);
      if (del.error) return del.error;
      if (!ids.length) return null;
      const ins = await supabase.from(table).insert(ids.map((option_id) => ({ event_id: event.id, option_id })));
      return ins.error;
    };

    const e2 = e1 ? null : await replace("event_emotions", emotions);
    const e3 = e1 || e2 ? null : await replace("event_triggers", triggers);

    if (e1 || e2 || e3) {
      setBusy(false);
      setError(t("offlineError"));
      return;
    }
    // Sunucudaki hali artık en güncel; cihazdaki eski kopya üzerine yazmasın
    await localDb.events.delete(event.id);
    onSaved();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex h-14 items-center justify-between">
        <button type="button" onClick={onCancel} className="tap-target-sm -ms-2 px-2 font-semibold text-muted-foreground">
          {t("cancel")}
        </button>
        <h1 className="font-semibold">{t("editTitle")}</h1>
        <span className="w-16" />
      </header>

      <main className="flex flex-1 flex-col gap-8 py-4">
        {behaviors.length > 1 && (
          <Field title={tu("behaviorTitle")}>
            <div className="grid grid-cols-2 gap-3" role="radiogroup">
              {behaviors.map((b) => (
                <ChoiceCard
                  key={b.id}
                  multiple={false}
                  label={behaviorLabel(b, tb)}
                  icon={<BehaviorIcon name={b.icon} className="size-5" />}
                  selected={behaviorId === b.id}
                  onToggle={() => setBehaviorId(b.id)}
                />
              ))}
            </div>
          </Field>
        )}

        <Field title={t("intensityBefore")}>
          <CompactSlider value={before} onChange={setBefore} label={t("intensityBefore")} />
        </Field>
        <Field title={t("intensityAfter")}>
          <CompactSlider value={after} onChange={setAfter} label={t("intensityAfter")} />
        </Field>

        <Field title={tu("emotionsTitle")}>
          <OptionGrid options={ofKind("emotion")} selected={emotions} onToggle={(id) => setEmotions((l) => toggle(l, id))} />
        </Field>
        <Field title={tu("triggersTitle")}>
          <OptionGrid options={ofKind("trigger")} selected={triggers} onToggle={(id) => setTriggers((l) => toggle(l, id))} />
        </Field>

        <Field title={tu("outcomeTitle")}>
          <div className="flex flex-col gap-2" role="radiogroup">
            {ofKind("outcome").map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={outcomeId === o.id}
                onClick={() => setOutcomeId(outcomeId === o.id ? null : o.id)}
                className={cn(
                  "tap-target rounded-xl border-2 px-4 text-start font-semibold transition-colors",
                  outcomeId === o.id ? "border-primary bg-accent text-accent-foreground" : "border-transparent bg-card",
                )}
              >
                {label(o)}
              </button>
            ))}
          </div>
        </Field>

        <Field title={t("notes")}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={t("notesPlaceholder")}
            className="w-full resize-none rounded-xl border-2 border-transparent bg-card p-4 outline-none focus:border-primary"
          />
        </Field>
      </main>

      <footer className="sticky bottom-0 flex flex-col gap-2 bg-background/90 pt-2 pb-safe backdrop-blur">
        {error && (
          <p role="alert" className="text-center text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <PrimaryButton onClick={() => void save()} loading={busy}>
          {t("save")}
        </PrimaryButton>
      </footer>
    </div>
  );
}

function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function CompactSlider({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
}) {
  const t = useTranslations("history");
  if (value == null) {
    return (
      <button type="button" onClick={() => onChange(5)} className="tap-target-sm self-start font-semibold text-primary">
        {t("addValue")}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="urge-range flex-1"
        style={{ "--fill": `${value * 10}%` } as CSSProperties}
      />
      <span className="numeric w-8 text-end text-2xl font-bold">{value}</span>
    </div>
  );
}
