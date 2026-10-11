// Desteklenen diller. Arapça ve Kürtçe (RTL) ileride buraya eklenecek;
// eklendiklerinde layout'taki dir="rtl" kendiliğinden çalışır.
export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_COOKIE = "NEXT_LOCALE";

const RTL_LOCALES: readonly string[] = ["ar", "ku"];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function directionFor(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}
