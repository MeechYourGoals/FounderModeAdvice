// Permanent founder/operator accounts: full admin + Boardroom (series_z) with
// unlimited limits. Billing rails (Paddle / Stripe / RevenueCat) must never
// downgrade these accounts, so every server-side tier write consults this list.
// Keep in sync with src/services/subscriptionService.ts FOUNDER_EMAILS and the
// public.is_founder_email() SQL helper.
export const FOUNDER_EMAILS = [
  "ccamechi@gmail.com",
  "chrisatown@gmail.com",
  "ca@saintmarlolabs.com",
];

export function isFounderEmail(email?: string | null): boolean {
  return !!email && FOUNDER_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * True when the auth user (primary email or any linked identity email) is a
 * founder. Requires a service-role client. Fails closed to `false` on lookup
 * errors so normal billing writes keep working.
 */
export async function isFounderUserId(admin: any, userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) return false;
    const emails = [
      data?.user?.email,
      ...((data?.user?.identities ?? []) as { identity_data?: { email?: string } }[]).map(
        (i) => i.identity_data?.email,
      ),
    ];
    return emails.some((e) => isFounderEmail(e));
  } catch {
    return false;
  }
}
