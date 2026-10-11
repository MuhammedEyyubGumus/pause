import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16: middleware.ts yerine proxy.ts
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Statik dosyalar, ikonlar, manifest ve service worker hariç her şey
    "/((?!_next/static|_next/image|serwist|icons|manifest.webmanifest|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
