import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/pause/brand";
import type { createClient } from "@/lib/supabase/server";

import { adminSignOut } from "./actions";
import { AdminNav } from "./nav";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Peace Therapist panelindeki gibi: solda logo ve menü, sağda içerik
export async function AdminShell({ supabase, email, children }: { supabase: Supabase; email: string | undefined; children: ReactNode }) {
  const t = await getTranslations("admin");
  const { data: overview } = await supabase.rpc("admin_overview");
  const newFeedback = Number((overview as { feedback_new?: number } | null)?.feedback_new ?? 0);

  return (
    <div className="min-h-dvh bg-muted/40">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 px-4 pt-safe pb-safe md:flex-row md:gap-8 md:py-6">
        <aside className="flex flex-col gap-4 md:w-60 md:shrink-0">
          <div className="flex h-14 items-center justify-between md:h-auto md:pb-2">
            <BrandMark size="sm" />
          </div>
          <p className="hidden text-xs font-semibold tracking-wide text-muted-foreground uppercase md:block">{t("title")}</p>
          <AdminNav newFeedback={newFeedback} />
          <div className="flex items-center justify-between gap-2 border-t border-border pt-4 md:mt-auto md:flex-col md:items-start">
            {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
            <form action={adminSignOut}>
              <button className="tap-target-sm inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <LogOut className="size-4" aria-hidden />
                {t("signOut")}
              </button>
            </form>
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col gap-6 pb-8">{children}</main>
      </div>
    </div>
  );
}
