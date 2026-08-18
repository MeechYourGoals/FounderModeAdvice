// Operator privilege lives in public.user_roles (role = admin), never in
// client bundles or email allowlists.
//
// Two semantics, one module:
//   - userHasAdminRole: privilege grants (analyze / video-chat). Fail closed
//     to false if user_roles cannot be read — do not grant access.
//   - lookupAdminRole / protectAdminSubscriptionTier: billing writes.
//     Throw if user_roles cannot be read so Stripe / Paddle / RevenueCat
//     retry instead of persisting free or seed for an admin.

export type BillingTier = "free" | "seed" | "series_z";

type RoleLookupResult = {
  data: { role?: string } | null;
  error: { message: string } | null;
};

type AdminClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<RoleLookupResult>;
        };
      };
    };
  };
};

export function applyAdminTierFloor(isAdmin: boolean, tier: BillingTier): BillingTier {
  return isAdmin ? "series_z" : tier;
}

/** Throws when user_roles cannot be read so billing webhooks retry instead of downgrading. */
export async function lookupAdminRole(admin: AdminClient, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    throw new Error(`user_roles admin lookup failed: ${error.message}`);
  }

  return Boolean(data);
}

/** Privilege grant: fail closed (not admin) if the role table is unavailable. */
export async function userHasAdminRole(admin: AdminClient, userId: string): Promise<boolean> {
  try {
    return await lookupAdminRole(admin, userId);
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Billing writes must not strip an admin's series_z row.
 * Lookup failures throw so the provider retries rather than persisting free/seed.
 */
export async function protectAdminSubscriptionTier(
  admin: AdminClient,
  userId: string,
  incomingTier: BillingTier,
): Promise<BillingTier> {
  if (incomingTier === "series_z") return incomingTier;
  const isAdmin = await lookupAdminRole(admin, userId);
  return applyAdminTierFloor(isAdmin, incomingTier);
}
