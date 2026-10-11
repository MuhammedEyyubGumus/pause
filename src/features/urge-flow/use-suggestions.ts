"use client";

import { useEffect, useState } from "react";

import { MIN_N, parseInsights } from "@/features/insights/analyze";
import { createClient } from "@/lib/supabase/client";

// "Bu durumda denemeye değer" (brief bölüm 11): alternatif seçiminde en üstte
//  1) kullanıcının son zincir incelemesinde "bir dahaki sefere" dediği alternatif,
//  2) seçtiği tetikleyicide en az MIN_N ölçümle dürtüyü en çok düşüren alternatif.
// Akışı bekletmemek için pause başladıktan sonra arka planda yüklenir; ağ yoksa boş kalır.

export type Suggestion =
  | { kind: "plan"; optionId: string }
  | { kind: "worked"; optionId: string; triggerId: string; avgChange: number; n: number };

type Pair = { trigger_id: string; intervention_id: string; n: number; avg_change: number };

export function useSuggestions(behaviorId: string | null | undefined, enabled: boolean) {
  const [plan, setPlan] = useState<string | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]);

  useEffect(() => {
    if (!behaviorId || !enabled) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      try {
        const [{ data: reflections }, { data: raw }] = await Promise.all([
          supabase
            .from("reflections")
            .select("next_option_id, created_at, urge_events!inner(behavior_id)")
            .eq("urge_events.behavior_id", behaviorId)
            .not("next_option_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(1),
          supabase.rpc("get_insights", { p_behavior: behaviorId }),
        ]);
        if (cancelled) return;
        setPlan(reflections?.[0]?.next_option_id ?? null);
        setPairs(parseInsights(raw).pairs.filter((p) => p.n >= MIN_N && p.avg_change < 0));
      } catch {
        // Öneriler isteğe bağlı; hata akışı etkilemesin
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [behaviorId, enabled]);

  return function suggestionsFor(triggerIds: string[], usable: (optionId: string) => boolean): Suggestion[] {
    const out: Suggestion[] = [];
    if (plan && usable(plan)) out.push({ kind: "plan", optionId: plan });

    const best = pairs
      .filter((p) => triggerIds.includes(p.trigger_id) && usable(p.intervention_id))
      .sort((a, b) => a.avg_change - b.avg_change || b.n - a.n)[0];
    if (best && !out.some((s) => s.optionId === best.intervention_id)) {
      out.push({
        kind: "worked",
        optionId: best.intervention_id,
        triggerId: best.trigger_id,
        avgChange: best.avg_change,
        n: best.n,
      });
    }
    return out;
  };
}
