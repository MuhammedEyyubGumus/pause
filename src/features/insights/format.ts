// İçgörü ekranındaki sayıların yerel biçimi (tr: "%64", "−2,4"; en: "64%", "−2.4")

export function fmtPercent(value: number | null, locale: string) {
  if (value == null) return "–";
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(value);
}

export function fmtScore(value: number | null, locale: string) {
  if (value == null) return "–";
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

// Değişim her zaman işaretli; tipografik eksi ile
export function fmtChange(value: number | null, locale: string) {
  if (value == null) return "–";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  })
    .format(value)
    .replace("-", "−");
}

export const fmtHour = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;

// ISO gün numarası (1 = Pazartesi) -> yerel gün adı
export function weekdayName(isoDay: number, locale: string) {
  // 2024-01-01 bir Pazartesi
  const d = new Date(Date.UTC(2024, 0, isoDay));
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(d);
}

export function weekdayShort(isoDay: number, locale: string) {
  const d = new Date(Date.UTC(2024, 0, isoDay));
  return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(d);
}
