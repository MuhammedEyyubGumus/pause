import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

// Tarayıcı istemcisi. Publishable anahtar istemcide durabilir;
// veriyi koruyan şey RLS politikalarıdır.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
