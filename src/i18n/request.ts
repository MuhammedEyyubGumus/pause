import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";

// URL'de dil öneki yok (/tr/..., /en/... değil). Dil şu sırayla seçilir:
// 1. Kullanıcının Ayarlar'da seçtiği dil (çerez)
// 2. Tarayıcı dili İngilizce ise "en"
// 3. Varsayılan "tr"
async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const accept = (await headers()).get("accept-language") ?? "";
  if (/^\s*en\b/i.test(accept)) return "en";

  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
