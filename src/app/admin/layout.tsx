import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/pause/brand";
import { requireAdmin } from "@/features/admin/guard";
import { AdminNav } from "@/features/admin/nav";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin");
  const { data: overview } = await supabase.rpc("admin_overview");
  const newFeedback = Number((overview as { feedback_new?: number } | null)?.feedback_new ?? 0);

  return (
    <div className="min-h-dvh bg-muted/40">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 px-4 pt-safe pb-safe md:flex-row md:gap-8 md:py-6">
        <aside className="flex flex-col gap-4 md:w-60 md:shrink-0">
          <div className="flex h-14 items-center md:h-auto md:pb-2">
            <BrandMark size="sm" />
          </div>
          <p className="hidden text-xs font-semibold tracking-wide text-muted-foreground uppercase md:block">{t("title")}</p>
          <AdminNav newFeedback={newFeedback} />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col gap-6 pb-8">{children}</main>
      </div>
    </div>
  );
}
