import { Suspense } from "react";

import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  // LoginForm useSearchParams kullandığı için Suspense içinde olmalı
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
