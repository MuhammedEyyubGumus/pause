import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// E-postadaki bağlantı buraya döner. İki biçimi de destekler:
//  - ?code=...                     (varsayılan Supabase şablonu, PKCE akışı)
//  - ?token_hash=...&type=email    (ileride özel şablon kullanılırsa)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}/`);
  }

  // Bağlantı geçersiz, süresi dolmuş ya da başka bir tarayıcıda açılmış
  return NextResponse.redirect(`${origin}/login?error=link`);
}
