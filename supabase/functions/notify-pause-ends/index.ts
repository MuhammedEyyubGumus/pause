// Supabase Edge Function: süresi dolan pause'lar için "Süre doldu" bildirimi.
// pg_cron her 30 saniyede bir çağırır (supabase/setup/push_cron.sql).
import { createClient } from "npm:@supabase/supabase-js@2";

import { notifyDuePauses } from "./handler.ts";

Deno.serve(async (req) => {
  // Yalnızca zamanlayıcı çağırabilsin
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const vapid = {
    publicKey: Deno.env.get("VAPID_PUBLIC_KEY")!,
    privateKey: Deno.env.get("VAPID_PRIVATE_KEY")!,
    subject: Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@example.com",
  };

  try {
    const result = await notifyDuePauses(
      {
        async claimDue() {
          const { data, error } = await supabase.rpc("claim_due_pause_notifications");
          if (error) throw error;
          return data ?? [];
        },
        async subscriptionsFor(userIds) {
          const { data, error } = await supabase
            .from("push_subscriptions")
            .select("user_id, endpoint, p256dh, auth, locale")
            .in("user_id", userIds);
          if (error) throw error;
          return data ?? [];
        },
        async removeSubscription(userId, endpoint) {
          await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
        },
        async markSuccess(userId, endpoint) {
          await supabase
            .from("push_subscriptions")
            .update({ last_success_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("endpoint", endpoint);
        },
      },
      vapid,
    );
    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
});
