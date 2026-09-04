// Verifies a user's RevenueCat entitlement server-side and writes the
// resulting tier to public.user_subscriptions using the service role.
// Clients must NOT write to user_subscriptions directly — RLS forbids it.
// The caller's JWT identifies the user; any client-supplied tier is ignored.
// Entitlement mapping + verification live in ../_shared/revenuecat.ts, shared
// with the revenuecat-webhook function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { syncUserEntitlements } from "../_shared/revenuecat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const rcKey = Deno.env.get("REVENUECAT_API_KEY");

    // Verify the caller's JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (!rcKey) {
      console.error("REVENUECAT_API_KEY not configured; refusing to overwrite subscription state");
      return json({ error: "Service temporarily unavailable" }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tier = await syncUserEntitlements(admin, userData.user.id, rcKey);
    return json({ tier });
  } catch (e) {
    console.error("sync-revenuecat-subscription error", e);
    const message = e instanceof Error ? e.message : String(e);
    // RevenueCat unreachable → 502 so clients treat it as transient.
    const status = /RevenueCat verification failed/.test(message) ? 502 : 500;
    return json(
      { error: status === 502 ? "Could not verify subscription" : "Service temporarily unavailable" },
      status,
    );
  }
});
