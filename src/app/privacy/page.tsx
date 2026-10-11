import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";

import { PRIVACY, PRIVACY_UPDATED } from "@/features/privacy/content";

// Herkese açık sayfa: giriş yapmadan da okunabilir (proxy PUBLIC_PATHS).
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: `${PRIVACY[locale === "en" ? "en" : "tr"].title} · PAUSE` };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const c = PRIVACY[locale === "en" ? "en" : "tr"];
  const updated = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${PRIVACY_UPDATED}T00:00:00Z`),
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex h-14 items-center gap-2">
        <Link
          href="/"
          aria-label="PAUSE"
          className="tap-target-sm -ms-3 grid place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-6 rtl:rotate-180" />
        </Link>
        <h1 className="text-xl font-semibold">{c.title}</h1>
      </header>

      <main className="flex flex-col gap-6 py-4">
        <p className="text-lg leading-relaxed">{c.intro}</p>
        {c.sections.map((s) => (
          <section key={s.title} className="flex flex-col gap-2">
            <h2 className="font-semibold">{s.title}</h2>
            <ul className="flex list-disc flex-col gap-1.5 ps-5 text-muted-foreground">
              {s.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-sm text-muted-foreground">
          {c.updated}: {updated}
        </p>
      </main>
    </div>
  );
}
