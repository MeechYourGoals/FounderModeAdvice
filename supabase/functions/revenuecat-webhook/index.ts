// RevenueCat server notifications → Supabase subscription state.
//
// This is the path that keeps `user_subscriptions` honest when the app is
// closed: renewals, cancellations, expirations, billing issues, refunds, and
// restore transfers all land here. The event is treated purely as a TRIGGER —
// we never apply event payload state directly. Instead we re-verify the
// affected user(s) against the RevenueCat REST API and persist the verified
// result (blended with any active web/Paddle subscription). That makes the
// handler naturally idempotent and replay-safe: replaying an old event just
// re-syncs current truth.
//
// Auth: RevenueCat sends the exact Authorization header value configured in
// the dashboard webhook settings. Set the same value as the
// REVENUECAT_WEBHOOK_AUTH secret. Requests without it are rejected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { syncUserEntitlements } from "../_shared/revenuecat.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Constant-time-ish comparison to avoid trivially timing the shared secret. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

/**
 * Collect every app user id the event may concern. RevenueCat app user ids
 * are Supabase auth UUIDs in this app (the shell configures the SDK with the
 * signed-in user id), so anything non-UUID (e.g. $RCAnonymousID:…) is skipped.
 */
function candidateUserIds(event: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const push = (value: unknown) => {
    if (typeof value === "string" && UUID_RE.test(value)) ids.add(value.toLowerCase());
    if (Array.isArray(value)) value.forEach(push);
  };
  push(event.app_user_id);
  push(event.original_app_user_id);
  push(event.aliases);
  push(event.transferred_from);
  push(event.transferred_to);
  return [...ids];
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const expectedAuth = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  if (!expectedAuth) {
    console.error("REVENUECAT_WEBHOOK_AUTH not configured; rejecting webhook");
    return new Response("Service temporarily unavailable", { status: 503 });
  }
  const gotAuth = req.headers.get("Authorization") ?? "";
  if (!safeEqual(gotAuth, expectedAuth)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rcKey = Deno.env.get("REVENUECAT_API_KEY");
  if (!rcKey) {
    console.error("REVENUECAT_API_KEY not configured; cannot verify entitlements");
    return new Response("Service temporarily unavailable", { status: 503 });
  }

  let event: Record<string, unknown>;
  try {
    const body = await req.json();
    event = (body?.event ?? {}) as Record<string, unknown>;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const userIds = candidateUserIds(event);
  if (userIds.length === 0) {
    // Anonymous-only event (no Supabase identity attached yet) — nothing to sync.
    console.log("revenuecat-webhook: no UUID app user ids on event", event.type);
    return new Response(JSON.stringify({ synced: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const synced: Array<{ userId: string; tier: string }> = [];
  try {
    for (const userId of userIds) {
      const tier = await syncUserEntitlements(admin, userId, rcKey);
      synced.push({ userId, tier });
    }
  } catch (e) {
    // Verification failed — return 5xx so RevenueCat retries the delivery.
    console.error("revenuecat-webhook sync failed", e);
    return new Response("Entitlement sync failed", { status: 502 });
  }

  console.log("revenuecat-webhook: synced", event.type, synced);
  return new Response(JSON.stringify({ synced }), {
    headers: { "Content-Type": "application/json" },
  });
});
