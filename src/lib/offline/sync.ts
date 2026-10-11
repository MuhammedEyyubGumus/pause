"use client";

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

import { type LocalEvent, localDb } from "./db";

let running: Promise<void> | null = null;

// Gönderilmemiş olayları sunucuya yazar. Aynı olay iki kez gönderilse de
// tek kayıt oluşur (upsert + ilişki tablolarının yeniden yazılması).
export function syncPending(): Promise<void> {
  if (!running) {
    running = doSync().finally(() => {
      running = null;
    });
  }
  return running;
}

async function doSync() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const pending = await localDb.events.where("synced").equals(0).toArray();

  for (const ev of pending) {
    if (ev.userId !== session.user.id) continue;
    try {
      await pushEvent(supabase, ev);
      // Gönderim sırasında olay değişmediyse "gönderildi" işaretle
      await localDb.events
        .where("id")
        .equals(ev.id)
        .filter((e) => e.updatedAt === ev.updatedAt)
        .modify({ synced: 1 });
    } catch (error) {
      // Ağ yok ya da geçici hata: bir sonraki denemede tekrar gönderilir
      console.warn("[pause] sync failed", ev.id, error);
      if (!navigator.onLine) return;
    }
  }

  await cleanup();
}

type Client = ReturnType<typeof createClient>;

async function pushEvent(supabase: Client, ev: LocalEvent) {
  const check = (r: { error: unknown }) => {
    if (r.error) throw r.error;
  };

  check(await supabase.from("urge_events").upsert(ev.row, { onConflict: "id" }));

  // Çoklu seçimler: sil + yeniden yaz (idempotent)
  check(await supabase.from("event_emotions").delete().eq("event_id", ev.id));
  if (ev.emotions.length) {
    check(
      await supabase.from("event_emotions").insert(ev.emotions.map((option_id) => ({ event_id: ev.id, option_id }))),
    );
  }

  check(await supabase.from("event_triggers").delete().eq("event_id", ev.id));
  if (ev.triggers.length) {
    check(
      await supabase.from("event_triggers").insert(ev.triggers.map((option_id) => ({ event_id: ev.id, option_id }))),
    );
  }

  if (ev.interventions.length) {
    check(
      await supabase.from("event_interventions").upsert(
        ev.interventions.map((i) => ({ ...i, event_id: ev.id, details: i.details as Json })),
        { onConflict: "id" },
      ),
    );
  }

  const answers = ev.answers.filter((a) => a.value_num !== null);
  check(await supabase.from("event_answers").delete().eq("event_id", ev.id));
  if (answers.length) {
    check(await supabase.from("event_answers").insert(answers.map((a) => ({ ...a, event_id: ev.id }))));
  }
}

// Gönderilmiş ve bitmiş olayları cihazda 2 günden fazla tutma
async function cleanup() {
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  await localDb.events
    .where("updatedAt")
    .below(cutoff)
    .filter((e) => e.synced === 1 && e.row.pause_status !== "active")
    .delete();
}

// Olayı cihaza yazar ve arka planda göndermeyi dener
export async function saveLocalEvent(ev: Omit<LocalEvent, "synced" | "updatedAt">) {
  await localDb.events.put({ ...ev, synced: 0, updatedAt: Date.now() });
  void syncPending();
}

// Bu kullanıcının devam eden (bitmemiş) pause'u
export async function findActiveLocalEvent(userId: string): Promise<LocalEvent | undefined> {
  const recent = Date.now() - 6 * 60 * 60 * 1000;
  const events = await localDb.events.where("userId").equals(userId).toArray();
  return events
    .filter((e) => e.row.pause_status === "active" && e.row.pause_ends_at && Date.parse(e.row.pause_ends_at) > recent)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}
