// Shared RevenueCat entitlement verification + tier persistence.
// Used by sync-revenuecat-subscription (client-triggered re-verify) and
// revenuecat-webhook (server-triggered re-verify). Both paths treat the
// RevenueCat REST API as the source of truth and never trust caller input.
// Admin users (user_roles.role = admin) cannot be written below series_z.

import { lookupAdminRole, protectAdminSubscriptionTier, type BillingTier } from "./admin.ts";

export type Tier = BillingTier;

// Map RevenueCat entitlement/product identifiers to internal tiers.
// Keep in sync with src/types/subscription.ts and RevenueCat Offerings
// (scripts/verify-subscription-mapping.mjs checks this file against the client).
export const ENTITLEMENT_TO_TIER: Record<string, Tier> = {
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

export function pickHighestTier(tiers: Tier[]): Tier {
  if (tiers.includes("series_z")) return "series_z";
  if (tiers.includes("seed")) return "seed";
  return "free";
}

export interface RevenueCatVerification {
  tier: Tier;
  /** Latest expiry among active entitlements (null for lifetime/none). */
  currentPeriodEnd: string | null;
}

/**
 * Ask RevenueCat which entitlements are currently active for this app user id.
 * Throws on transport/API failure so callers can fail closed instead of
 * accidentally downgrading a paying user.
 */
export async function verifyRevenueCatEntitlements(
  appUserId: string,
  rcKey: string,
): Promise<RevenueCatVerification> {
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${rcKey}`, "Content-Type": "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`RevenueCat verification failed: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  const entitlements = body?.subscriber?.entitlements ?? {};
  const now = Date.now();
  const activeTiers: Tier[] = [];
  let currentPeriodEnd: string | null = null;

  for (const [key, value] of Object.entries<any>(entitlements)) {
    const expires = value?.expires_date ? Date.parse(value.expires_date) : Infinity;
    if (expires > now) {
      const mapped =
        ENTITLEMENT_TO_TIER[key] ?? ENTITLEMENT_TO_TIER[value?.product_identifier ?? ""];
      if (mapped) {
        activeTiers.push(mapped);
        if (value?.expires_date && (!currentPeriodEnd || expires > Date.parse(currentPeriodEnd))) {
          currentPeriodEnd = value.expires_date;
        }
      }
    }
  }

  return { tier: pickHighestTier(activeTiers), currentPeriodEnd };
}

/**
 * Active web (Paddle) tier from the `subscriptions` audit table, so a
 * RevenueCat-driven write can never clobber a live web subscription with
 * "free" — the persisted tier is the highest of both billing rails.
 * Sandbox rows only count when PADDLE_ALLOW_SANDBOX_ENTITLEMENTS=true
 * (mirrors payments-webhook).
 */
export async function fetchActivePaddleTier(admin: any, userId: string): Promise<Tier> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("product_id, status, environment, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"]);

  if (error) {
    // Missing table or transient error — treat as no web subscription.
    console.warn("fetchActivePaddleTier failed", error.message);
    return "free";
  }

  const allowSandbox = Deno.env.get("PADDLE_ALLOW_SANDBOX_ENTITLEMENTS") === "true";
  const now = Date.now();
  const tiers: Tier[] = (data ?? [])
    .filter((row: any) => row.environment === "live" || allowSandbox)
    .filter((row: any) => !row.current_period_end || Date.parse(row.current_period_end) > now)
    .map((row: any) => (row.product_id === "boardroom" ? "series_z" : row.product_id === "c_suite" ? "seed" : "free"));

  return pickHighestTier(tiers);
}

/** Persist the resolved tier (single row per user; used by all feature gating). */
export async function writeUserSubscriptionTier(
  admin: any,
  userId: string,
  incomingTier: Tier,
  currentPeriodEnd: string | null,
): Promise<Tier> {
  const tier = await protectAdminSubscriptionTier(admin, userId, incomingTier);
  const { error } = await admin.from("user_subscriptions").upsert(
    {
      user_id: userId,
      tier,
      status: "active",
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Failed to upsert subscription: ${error.message}`);
  return tier;
}

/**
 * Full re-sync for one user: RevenueCat entitlements blended with any active
 * web subscription, persisted to user_subscriptions. Returns the final tier.
 * Throws if RevenueCat cannot be reached (callers decide retry semantics).
 */
export async function syncUserEntitlements(
  admin: any,
  userId: string,
  rcKey: string,
): Promise<Tier> {
  // Protected admin accounts are pinned to Boardroom. lookupAdminRole throws
  // if user_roles is unavailable so this sync returns non-2xx and retries
  // instead of writing a lower tier.
  if (await lookupAdminRole(admin, userId)) {
    await writeUserSubscriptionTier(admin, userId, "series_z", null);
    return "series_z";
  }
  const rc = await verifyRevenueCatEntitlements(userId, rcKey);
  const paddleTier = await fetchActivePaddleTier(admin, userId);
  const tier = pickHighestTier([rc.tier, paddleTier]);
  // Only carry RevenueCat's period end when RevenueCat is the winning rail —
  // Paddle's own webhook maintains period data for web-billed users.
  const periodEnd = rc.tier === tier && rc.tier !== "free" ? rc.currentPeriodEnd : null;
  return await writeUserSubscriptionTier(admin, userId, tier, periodEnd);
}
