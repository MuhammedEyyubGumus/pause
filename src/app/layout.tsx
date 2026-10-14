import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { directionFor } from "@/i18n/config";

import { arabic, jakarta } from "./fonts";
import { SerwistProvider } from "./serwist";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "PAUSE",
  title: { default: "PAUSE", template: "%s · PAUSE" },
  description: "Peace Therapist · Dürtü ile davranış arasındaki alanı büyüt.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PAUSE",
  },
  formatDetection: { telephone: false },
  icons: { apple: "/icons/apple-touch-icon.png" },
  // Davranış verisi hassas: arama motorlarına kapalı
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // çentik ve ana ekran çubuğu için pt-safe / pb-safe
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF9FC" },
    { media: "(prefers-color-scheme: dark)", color: "#FBF9FC" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={directionFor(locale)}
      suppressHydrationWarning
      className={`${jakarta.variable} ${arabic.variable}`}
    >
      <body>
        <NextIntlClientProvider>
          {/* Marka: beyaz + mor. Telefon koyu modda olsa da açık tema kullanılır. */}
          <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
            {/* İnternet geri gelince sayfayı yenileme: bir egzersizin ortasında ekran sıfırlanmasın.
                Bekleyen kayıtları SyncAgent gönderir. */}
            <SerwistProvider swUrl="/serwist/sw.js" reloadOnOnline={false}>
              {children}
            </SerwistProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
