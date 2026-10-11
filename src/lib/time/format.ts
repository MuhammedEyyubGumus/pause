import { safeTimeZone } from "./local";

// Tarih/saat biçimleri her zaman kullanıcının saat diliminde ve dilinde.

export function formatTime(iso: string, locale: string, timeZone: string | null | undefined) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: safeTimeZone(timeZone),
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: string, timeZone: string | null | undefined) {
  const tz = safeTimeZone(timeZone);
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", weekday: "long", timeZone: tz }).format(
    new Date(iso),
  );
  return `${date} · ${formatTime(iso, locale, tz)}`;
}

// "YYYY-MM-DD" -> bir önceki gün
export function previousDate(localDate: string) {
  const d = new Date(`${localDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Gün başlığı: Bugün / Dün / 5 Ekim Pazar
export function formatDayHeading(
  localDate: string,
  today: string,
  locale: string,
  labels: { today: string; yesterday: string },
) {
  if (localDate === today) return labels.today;
  if (localDate === previousDate(today)) return labels.yesterday;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", weekday: "long", timeZone: "UTC" }).format(
    new Date(`${localDate}T12:00:00Z`),
  );
}

export function formatDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
