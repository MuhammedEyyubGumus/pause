// Uygulamadan (tarayıcıdan) çağrılan fonksiyonlar için ortak parçalar:
// CORS + isteği yapan kullanıcıyı oturum anahtarından doğrulama.
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function adminClient(): SupabaseClient {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
  return createClient(Deno.env.get("SUPABASE_URL")!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Authorization: Bearer <kullanıcının oturum anahtarı>  ->  kullanıcı (yoksa null)
export async function requestUser(req: Request, admin: SupabaseClient): Promise<User | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}
