import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from "next/font/google";

// Latin + Türkçe karakterler (ç, ğ, ı, İ, ö, ş, ü) latin-ext içinde.
export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
  display: "swap",
});

// Arapça ve Sorani Kürtçe için eş font. Önden yüklenmez; yalnızca
// Arapça karakter görüldüğünde indirilir, Türkçe kullanıcıyı yavaşlatmaz.
export const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
});
