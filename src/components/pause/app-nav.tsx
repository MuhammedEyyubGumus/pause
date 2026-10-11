"use client";

import { History, House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

// Alt sekmeler. İçgörüler Phase 2'de buraya eklenecek.
const TABS = [
  { href: "/", key: "home", Icon: House },
  { href: "/history", key: "history", Icon: History },
] as const;

export function AppNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-border/60 bg-background/85 px-4 pb-safe backdrop-blur-md">
      <ul className="flex">
        {TABS.map(({ href, key, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap-target flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
