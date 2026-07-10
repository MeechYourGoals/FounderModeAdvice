// RevenueCat webhook receiver: keeps public.user_subscriptions in sync when
// subscription state changes OUTSIDE the app (renewals, cancellations,
// expirations, billing issues, product changes). The in-app flows
// (purchase/restore) already sync through sync-revenuecat-subscription.
//
// Security model:
//  - The request must carry the shared secret configured in the RevenueCat
//    dashboard (Authorization header) matching REVENUECAT_WEBHOOK_AUTH_TOKEN.
//  - The webhook payload is NEVER trusted for entitlement state. It only tells
//    us WHICH user changed; the actual tier is re-fetched from the RevenueCat
//    REST API with REVENUECAT_API_KEY, exactly like sync-revenuecat-subscription.
//
// RevenueCat dashboard setup: Project → Integrations → Webhooks →
//   URL:            https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
//   Authorization:  <value of REVENUECAT_WEBHOOK_AUTH_TOKEN>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type Tier = "free" | "seed" | "series_z";

// Map RevenueCat entitlement/product identifiers to internal tiers.
// Keep in sync with src/types/subscription.ts and
// supabase/functions/sync-revenuecat-subscription/index.ts.
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * RevenueCat events can reference anonymous ids ($RCAnonymousID:...) as well
 * as our real app user ids (Supabase auth UUIDs, set via Purchases.configure).
 * Pick the first UUID-shaped id from the event's id + aliases.
 */
function resolveSupabaseUserId(event: Record<string, unknown>): string | null {
  const candidates = [
    event.app_user_id,
    event.original_app_user_id,
    ...(Array.isArray(event.aliases) ? event.aliases : []),
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && UUID_RE.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const webhookToken = Deno.env.get("REVENUECAT_WEBHOOK_AUTH_TOKEN");
    const rcKey = Deno.env.get("REVENUECAT_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!webhookToken) {
      console.error("REVENUECAT_WEBHOOK_AUTH_TOKEN not configured; refusing webhook");
      return json({ error: "Webhook not configured" }, 500);
    }

    // RevenueCat sends the configured value verbatim in the Authorization
    // header; accept it with or without a "Bearer " prefix.
    const authHeader = req.headers.get("Authorization") ?? "";
    const presented = authHeader.replace(/^Bearer\s+/i, "");
    if (presented !== webhookToken) {
      console.error("RevenueCat webhook rejected: bad Authorization header");
      return json({ error: "Unauthorized" }, 401);
    }

    if (!rcKey) {
      console.error("REVENUECAT_API_KEY not configured; cannot verify entitlements");
      return json({ error: "REVENUECAT_API_KEY not configured" }, 500);
    }

    const payload = await req.json().catch(() => null);
    const event = (payload?.event ?? null) as Record<string, unknown> | null;
    if (!event) {
      return json({ error: "Missing event" }, 400);
    }

    const eventType = String(event.type ?? "UNKNOWN");
    if (eventType === "TEST") {
      return json({ ok: true, test: true });
    }

    const userId = resolveSupabaseUserId(event);
    if (!userId) {
      // Anonymous-only event (no Supabase user mapped yet). Nothing to sync;
      // return 200 so RevenueCat doesn't retry forever.
      console.log(`RevenueCat ${eventType}: no Supabase user id in event, skipping`);
      return json({ ok: true, skipped: "no-user-id" });
    }

    // Re-verify the subscriber's CURRENT entitlements — never the payload.
    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${rcKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!rcRes.ok) {
      const errorBody = await rcRes.text();
      console.error("RevenueCat verification failed", rcRes.status, errorBody);
      // Non-2xx makes RevenueCat retry with backoff — desirable for transient
      // API failures so the event isn't lost.
      return json({ error: "RevenueCat verification failed" }, 502);
    }

    const body = await rcRes.json();
    const entitlements = body?.subscriber?.entitlements ?? {};
    const now = Date.now();
    const activeTiers: Tier[] = [];
    for (const [key, value] of Object.entries<any>(entitlements)) {
      const expires = value?.expires_date ? Date.parse(value.expires_date) : Infinity;
      if (expires > now) {
        const mapped =
          ENTITLEMENT_TO_TIER[key] ??
          ENTITLEMENT_TO_TIER[value?.product_identifier ?? ""];
        if (mapped) activeTiers.push(mapped);
      }
    }
    const verifiedTier = pickHighestTier(activeTiers);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Only touch rows for real auth users; a deleted account's late events
    // are acknowledged without writing (200 keeps RevenueCat from retrying).
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(userId);
    if (authErr || !authUser?.user) {
      console.log(`RevenueCat ${eventType}: user ${userId} not found, skipping`);
      return json({ ok: true, skipped: "unknown-user" });
    }

    const { error: upsertErr } = await admin
      .from("user_subscriptions")
      .upsert(
        {
          user_id: userId,
          tier: verifiedTier,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertErr) {
      console.error("Failed to upsert subscription from webhook", upsertErr);
      return json({ error: upsertErr.message }, 500);
    }

    console.log(`RevenueCat ${eventType}: synced user ${userId} → ${verifiedTier}`);
    return json({ ok: true, tier: verifiedTier });
  } catch (e) {
    console.error("revenuecat-webhook error", e);
    return json({ error: String(e) }, 500);
  }
});
