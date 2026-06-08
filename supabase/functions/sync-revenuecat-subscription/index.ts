// Verifies a user's RevenueCat entitlement server-side and writes the
// resulting tier to public.user_subscriptions using the service role.
// Clients must NOT write to user_subscriptions directly — RLS forbids it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Tier = "free" | "seed" | "series_z";

// Map RevenueCat entitlement/product identifiers to internal tiers.
// Keep in sync with src/types/subscription.ts and RevenueCat Offerings.
const ENTITLEMENT_TO_TIER: Record<string, Tier> = {
  "Founder Mode Advisor Pro": "series_z",
  founder_mode_advisor_pro: "series_z",
  series_z_subscription: "series_z",
  series_z: "series_z",
  boardroom: "series_z",
  series_z_monthly: "series_z",
  seed_subscription: "seed",
  seed: "seed",
  c_suite: "seed",
  seed_monthly: "seed",
};

function pickHighestTier(tiers: Tier[]): Tier {
  if (tiers.includes("series_z")) return "series_z";
  if (tiers.includes("seed")) return "seed";
  return "free";
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    if (!rcKey) {
      console.error("REVENUECAT_API_KEY not configured; refusing to overwrite subscription state");
      return new Response(JSON.stringify({ error: "REVENUECAT_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let verifiedTier: Tier = "free";

    // Server-side verification against the RevenueCat REST API
    const rcRes = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`,
        {
          headers: {
            Authorization: `Bearer ${rcKey}`,
            "Content-Type": "application/json",
          },
        },
      );

    if (rcRes.ok) {
      const body = await rcRes.json();
      const entitlements = body?.subscriber?.entitlements ?? {};
      const now = Date.now();
      const activeTiers: Tier[] = [];
      for (const [key, value] of Object.entries<any>(entitlements)) {
        const expires = value?.expires_date
          ? Date.parse(value.expires_date)
          : Infinity;
        if (expires > now) {
          const mapped =
            ENTITLEMENT_TO_TIER[key] ??
            ENTITLEMENT_TO_TIER[value?.product_identifier ?? ""];
          if (mapped) activeTiers.push(mapped);
        }
      }
      verifiedTier = pickHighestTier(activeTiers);
    } else {
      const errorBody = await rcRes.text();
      console.error("RevenueCat verification failed", rcRes.status, errorBody);
      return new Response(JSON.stringify({ error: "RevenueCat verification failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: upsertErr } = await admin
      .from("user_subscriptions")
      .upsert(
        {
          user_id: user.id,
          tier: verifiedTier,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertErr) {
      console.error("Failed to upsert subscription", upsertErr);
      return new Response(JSON.stringify({ error: upsertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ tier: verifiedTier }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-revenuecat-subscription error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
