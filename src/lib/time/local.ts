// Bir anın kullanıcının saat dilimindeki tarih / saat / gün bilgisi.
// Olaylar kaydedilirken local_date, local_hour, local_weekday bundan gelir;
// böylece seyahatte bile "en riskli saat" doğru kalır.

export const FALLBACK_TIME_ZONE = "Europe/Istanbul";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type LocalParts = {
  date: string; // YYYY-MM-DD
  hour: number; // 0–23
  weekday: number; // ISO: 1 = Pazartesi … 7 = Pazar
};

export function safeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return FALLBACK_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function localParts(at: Date, timeZone: string | null | undefined): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(at);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")) % 24,
    weekday: WEEKDAYS.indexOf(get("weekday")) + 1,
  };
}

export type DayPart = "morning" | "afternoon" | "evening" | "night";

// Brief'teki gün dilimleri: Sabah 05–12, Öğleden sonra 12–17, Akşam 17–22, Gece 22–05
export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}
