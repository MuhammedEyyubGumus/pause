"use client";

import { ChartNoAxesColumn, LayoutDashboard, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", key: "overview", Icon: LayoutDashboard },
  { href: "/admin/metrics", key: "metrics", Icon: ChartNoAxesColumn },
  { href: "/admin/feedback", key: "feedback", Icon: MessageSquareText },
] as const;

// Peace Therapist panelindeki gibi: solda menü, seçili öğe dolu mor
export function AdminNav({ newFeedback }: { newFeedback: number }) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ITEMS.map(({ href, key, Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "tap-target-sm inline-flex shrink-0 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition-colors",
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {t(key)}
            {key === "feedback" && newFeedback > 0 && (
              <span
                className={cn(
                  "numeric ms-auto rounded-full px-2 text-xs",
                  active ? "bg-primary-foreground/20" : "bg-primary text-primary-foreground",
                )}
              >
                {newFeedback}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
