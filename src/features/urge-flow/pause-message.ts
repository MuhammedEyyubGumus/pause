// "PAUSE ile konuş" (brief bölüm 30): dürtü anında kısa, sakinleştirici mesaj.
// Sohbet başlatmaz; ağ gerektirmez. Yalnızca o anki kayıttan ve geçmiş verilerden
// zaten hesaplanmış bilgilerle cümle kurar (sayı uydurmaz).

export type TalkSuggestion =
  | { kind: "worked"; alternative: string; trigger: string; value: string }
  | { kind: "plan"; alternative: string }
  | { kind: "experiment"; alternative: string };

export type TalkInput = {
  urge: number | null;
  emotion: string | null;
  remainingMin: number | null; // pause sürüyorsa kalan dakika (yukarı yuvarlanmış)
  suggestion: TalkSuggestion | null;
};

type T = (key: string, values?: Record<string, string | number>) => string;

// Dürtünün güçlü sayıldığı eşik
export const STRONG_URGE = 8;

export function pauseMessage(input: TalkInput, t: T): string[] {
  const lines: string[] = [];
  const { urge, emotion } = input;

  // 1) Şu anki durumu yansıt
  if (emotion && urge != null) lines.push(t("feelBoth", { emotion, urge }));
  else if (emotion) lines.push(t("feelEmotion", { emotion }));
  else if (urge != null) lines.push(t("feelUrge", { urge }));
  if (urge != null && urge >= STRONG_URGE) lines.push(t("strong"));

  // 2) Karar baskısını kaldır
  lines.push(input.remainingMin && input.remainingMin > 0 ? t("space", { minutes: input.remainingMin }) : t("spaceNoClock"));

  // 3) Geçmişten: deney > plan > işe yarayan; yoksa birlikte öğreniyoruz
  const s = input.suggestion;
  if (s?.kind === "experiment") lines.push(t("experiment", { alternative: s.alternative }));
  else if (s?.kind === "plan") lines.push(t("plan", { alternative: s.alternative }));
  else if (s?.kind === "worked") lines.push(t("worked", { trigger: s.trigger, alternative: s.alternative, value: s.value }));
  else lines.push(t("learning"));

  return lines;
}

// Kalan süreyi dakikaya çevir (ör. 6 dk 10 sn -> 7)
export function remainingMinutes(ms: number | null | undefined) {
  if (ms == null || ms <= 0) return null;
  return Math.ceil(ms / 60_000);
}
