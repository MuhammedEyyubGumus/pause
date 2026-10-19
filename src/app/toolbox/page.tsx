import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { behaviorLabel, optionLabel } from "@/features/history/labels";
import { MIN_N } from "@/features/insights/analyze";
import { groupTools, keptRatio, parseToolbox, type Tool, type ToolboxSections, toolStatus, WORKS_DROP } from "@/features/toolbox/shared";
import { ToolCard } from "@/features/toolbox/tool-card";
import { requireOnboardedUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const SECTIONS = ["pinned", "works", "learning", "new", "weak"] as const satisfies readonly (keyof ToolboxSections)[];

// Kişisel araç kutusu: hangi alternatif sende ne kadar işe yarıyor, nerede işe yarıyor.
// Sabitlenenler ve gizlenenler dürtü anındaki alternatif listesini de değiştirir.
export default async function ToolboxPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const params = await searchParams;
  const { supabase, user } = await requireOnboardedUser();
  const t = await getTranslations("toolbox");
  const tb = await getTranslations("behaviors");
  const tOpt = await getTranslations("options");
  const locale = await getLocale();

  const { data: behaviors } = await supabase
    .from("behaviors")
    .select("id, name, template_key")
    .is("archived_at", null)
    .order("sort_order");
  const behaviorId = behaviors?.some((b) => b.id === params.b) ? params.b! : null;

  const [{ data: raw, error }, { data: contextOptions }] = await Promise.all([
    supabase.rpc("get_toolbox", behaviorId ? { p_behavior: behaviorId } : {}),
    supabase.from("options").select("id, kind, key, label").in("kind", ["trigger", "emotion"]),
  ]);
  if (error) throw error;

  const tools = parseToolbox(raw);
  const groups = groupTools(tools);
  type ContextOption = { kind: string; key: string | null; label: string | null };
  const optionById = new Map<string, ContextOption>((contextOptions ?? []).map((o) => [o.id, o]));
  const fmt = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 1 });
  const pct = (v: number) => v.toLocaleString(locale, { style: "percent", maximumFractionDigits: 0 });
  const href = (b: string | null) => (b ? `/toolbox?b=${b}` : "/toolbox");

  function describe(tool: Tool) {
    const status = toolStatus(tool);
    const lines: string[] = [];
    if (tool.uses > 0) {
      let change = "";
      if (tool.n > 0 && tool.avg_change != null) {
        change =
          tool.avg_change < 0
            ? t("changeDown", { value: fmt(Math.abs(tool.avg_change)) })
            : tool.avg_change > 0
              ? t("changeUp", { value: fmt(tool.avg_change) })
              : t("changeSame");
      }
      lines.push(change ? `${t("uses", { count: tool.uses })} · ${change}` : t("uses", { count: tool.uses }));
      const kept = keptRatio(tool);
      if (kept != null) lines.push(t("kept", { percent: pct(kept) }));
      const context = [tool.top_trigger_id, tool.top_emotion_id]
        .map((id) => (id ? optionLabel(optionById.get(id), tOpt) : ""))
        .filter(Boolean);
      if (context.length && status !== "weak") lines.push(t("context", { items: context.join(" · ") }));
    }
    return {
      status,
      badge: status === "learning" ? t("status.learning", { n: tool.n, min: MIN_N }) : t(`status.${status}`),
      lines,
      progress: status === "learning" ? Math.min(tool.n / MIN_N, 1) : null,
    };
  }

  const card = (tool: Tool) => {
    const d = describe(tool);
    return (
      <ToolCard
        key={tool.id}
        userId={user.id}
        optionId={tool.id}
        optionKey={tool.key}
        label={optionLabel({ kind: "intervention", key: tool.key, label: tool.label }, tOpt)}
        status={d.status}
        badge={d.badge}
        lines={d.lines}
        progress={d.progress}
        pinned={tool.pinned}
        hidden={tool.hidden}
        note={tool.note}
      />
    );
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex h-14 items-center gap-2">
        <Link
          href="/insights"
          aria-label={t("back")}
          className="tap-target-sm -ms-3 grid place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-6 rtl:rotate-180" />
        </Link>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </header>
      <p className="text-muted-foreground">{t("intro")}</p>

      {(behaviors?.length ?? 0) > 1 && (
        <nav
          aria-label={t("behaviorLabel")}
          className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {[{ id: null, label: t("allBehaviors") }, ...behaviors!.map((b) => ({ id: b.id, label: behaviorLabel(b, tb) }))].map(
            ({ id, label }) => (
              <Link
                key={id ?? "all"}
                href={href(id)}
                aria-current={id === behaviorId ? "page" : undefined}
                replace
                scroll={false}
                className={cn(
                  "tap-target-sm inline-flex shrink-0 items-center rounded-full border-2 px-4 text-sm font-semibold transition-colors",
                  id === behaviorId
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            ),
          )}
        </nav>
      )}

      <main className="flex flex-col gap-6 py-4">
        {tools.length === 0 && <p className="rounded-card bg-card p-5 text-muted-foreground">{t("empty")}</p>}

        {SECTIONS.map((key) =>
          groups[key].length ? (
            <section key={key} className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <h2 className="font-semibold">{t(`sections.${key}`)}</h2>
                <p className="text-sm text-muted-foreground">
                  {t(`hints.${key}`, { min: MIN_N, drop: fmt(Math.abs(WORKS_DROP)) })}
                </p>
              </div>
              <ul className="flex flex-col gap-2">{groups[key].map(card)}</ul>
            </section>
          ) : null,
        )}

        {groups.hidden.length > 0 && (
          <details className="group flex flex-col gap-2">
            <summary className="tap-target-sm flex cursor-pointer list-none items-center font-semibold text-muted-foreground">
              {t("sections.hidden", { count: groups.hidden.length })}
            </summary>
            <p className="pb-2 text-sm text-muted-foreground">{t("hints.hidden")}</p>
            <ul className="flex flex-col gap-2">{groups.hidden.map(card)}</ul>
          </details>
        )}
      </main>
    </div>
  );
}
