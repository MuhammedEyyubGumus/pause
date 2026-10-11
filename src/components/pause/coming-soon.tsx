import Link from "next/link";
import { getTranslations } from "next-intl/server";

// Geçici: dürtü akışı ve SOS bir sonraki modülde gelecek.
export async function ComingSoon() {
  const t = await getTranslations("soon");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center pt-safe pb-safe">
      <h1 className="text-question">{t("title")}</h1>
      <p className="text-muted-foreground">{t("body")}</p>
      <Link href="/" className="tap-target inline-flex items-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground">
        {t("home")}
      </Link>
    </main>
  );
}
