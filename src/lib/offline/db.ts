import Dexie, { type EntityTable } from "dexie";

import type { Database } from "@/types/database";

// Cihazdaki veritabanı (IndexedDB). Dürtü olayı önce buraya yazılır,
// sonra sync.ts sunucuya gönderir. İnternet yokken de akış kesilmez.

export type UrgeEventRow = Omit<
  Database["public"]["Tables"]["urge_events"]["Insert"],
  "user_id" | "urge_change" | "created_at" | "updated_at"
> & { id: string };

export type LocalIntervention = {
  id: string;
  option_id: string;
  position: number;
  started_at: string;
  ended_at: string | null;
  completed: boolean;
  details: Record<string, unknown>;
};

export type LocalAnswer = { question_key: string; value_num: number | null };

export type LocalEvent = {
  id: string;
  userId: string;
  row: UrgeEventRow;
  emotions: string[]; // option id'leri
  triggers: string[];
  interventions: LocalIntervention[];
  answers: LocalAnswer[];
  synced: 0 | 1;
  updatedAt: number;
};

export const localDb = new Dexie("pause") as Dexie & {
  events: EntityTable<LocalEvent, "id">;
};

localDb.version(1).stores({
  // Yalnızca sorgulanan alanlar indekslenir
  events: "id, userId, synced, updatedAt",
});
