import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Admin" };

// Panel çerçevesi (menü, çıkış) features/admin/shell.tsx içinde; giriş sayfası onu kullanmaz.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
