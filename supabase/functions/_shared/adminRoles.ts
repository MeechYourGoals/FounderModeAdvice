// Protected-admin detection for billing writes.
//
// Entitlement and admin status live ONLY in the database:
//   - public.user_roles.role = 'admin'  → protected admin
//   - public.user_subscriptions.tier    → plan
// No email or identity is hardcoded anywhere. Billing rails (Paddle / Stripe /
// RevenueCat) must never downgrade a protected admin's plan row.

/**
 * True when the user holds the `admin` role. Requires a service-role client.
 * Fails closed to `false` on lookup errors so normal billing writes keep working.
 */
export async function isProtectedAdmin(admin: any, userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}
