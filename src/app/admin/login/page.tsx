import type { Metadata } from "next";

import { AdminLoginForm } from "@/features/admin/login-form";

export const metadata: Metadata = { title: "Admin" };

// Yönetici girişi. Giriş yapmış yönetici buraya gelirse proxy panele yönlendirir.
export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
