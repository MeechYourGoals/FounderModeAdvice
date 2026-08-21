/**
 * Store paywall copy for the Expo IAP overlay (Guideline 3.1.2(c)).
 *
 * Product identifiers and USD amounts are the live App Store / site prices
 * (`seed_monthly` $9.99, `series_z_monthly` $19.99). Do not invent new SKUs
 * or prices here — `scripts/verify-subscription-mapping.mjs` checks this
 * catalog against `src/types/subscription.ts` (TIER_PRICING + REVENUECAT_PRODUCTS).
 *
 * Runtime StoreKit `priceString` is preferred for the number; this file
 * supplies the required length, feature list, auto-renew, cancel path, and
 * legal URLs that the default RevenueCat picker omitted.
 */

export const IAP_BILLING_PERIOD = "Monthly" as const;

export const IAP_LEGAL_URLS = {
  privacy: "https://foundermodeadvice.com/privacy-policy",
  terms: "https://foundermodeadvice.com/terms-of-service",
} as const;

export const IAP_DISCLOSURE = {
  autoRenew: "Auto-renews until canceled.",
  cancel:
    "Cancel anytime in Settings → Subscriptions, or with one tap in in-app Settings. You keep access until the period ends.",
} as const;

export type IapPlanId = "seed" | "series_z";

export type IapPlanCopy = {
  id: IapPlanId;
  /** App Store / RevenueCat product identifier — do not change. */
  productId: "seed_monthly" | "series_z_monthly";
  /** RevenueCat package identifiers that may wrap the same product. */
  packageAliases: readonly string[];
  displayName: string;
  length: typeof IAP_BILLING_PERIOD;
  priceUsd: number;
  priceDisplay: string;
  features: readonly string[];
};

export const IAP_PLANS: readonly IapPlanCopy[] = [
  {
    id: "series_z",
    productId: "series_z_monthly",
    packageAliases: ["$rc_monthly", "series_z_monthly", "boardroom"],
    displayName: "The Boardroom",
    length: IAP_BILLING_PERIOD,
    priceUsd: 19.99,
    priceDisplay: "$19.99/month",
    features: [
      "Unlimited source analyses",
      "Upload private docs, PDFs, notes & screenshots — not just public links",
      "Unlimited business profiles",
      "Run one source across multiple profiles in one go",
      "Ask-the-video AI chat (unlimited)",
      "Personalized insights by industry & stage",
      "Smart tag folders — long-press a tag to auto-file past and future analyses",
      "Share analyses & folders with teammates and advisors",
      "Notes & comments on individual insights",
      "Tag teammates in insight discussions",
      "Priority feature access",
      "Best for multiple ventures & clients",
    ],
  },
  {
    id: "seed",
    productId: "seed_monthly",
    packageAliases: ["c_suite_monthly", "seed_monthly", "c_suite"],
    displayName: "The C-Suite",
    length: IAP_BILLING_PERIOD,
    priceUsd: 9.99,
    priceDisplay: "$9.99/month",
    features: [
      "20 source analyses per month",
      "Upload private docs, PDFs, notes & screenshots — not just public links",
      "Up to 5 business profiles",
      "Personalized insights by industry & stage",
      "One analysis target per submission",
      "Organize analyses into private folders (manual)",
    ],
  },
] as const;

export const DEFAULT_IAP_PLAN_ID: IapPlanId = "series_z";

export type OfferingPackageLike = {
  identifier?: string | null;
  product?: { identifier?: string | null; priceString?: string | null } | null;
};

export function matchOfferingPackage<T extends OfferingPackageLike>(
  packages: readonly T[] | null | undefined,
  plan: IapPlanCopy,
): T | null {
  if (!packages?.length) return null;
  const byProduct = packages.find((pkg) => pkg.product?.identifier === plan.productId);
  if (byProduct) return byProduct;
  const aliases = new Set<string>([plan.productId, ...plan.packageAliases]);
  return packages.find((pkg) => aliases.has(pkg.identifier ?? "")) ?? null;
}

/**
 * Show StoreKit's localized price when the offering loaded; otherwise the
 * live site USD copy. Always include the monthly length (Apple 3.1.2(c)).
 */
export function formatPlanPrice(
  localizedPrice: string | null | undefined,
  plan: IapPlanCopy,
): string {
  const raw = (localizedPrice || plan.priceDisplay).trim();
  if (!raw) return plan.priceDisplay;
  if (/month|\/\s*mo\b|monthly/i.test(raw)) return raw.replace(/\s+/g, " ");
  return `${raw}/month`;
}

export function planById(id: IapPlanId): IapPlanCopy {
  const plan = IAP_PLANS.find((item) => item.id === id);
  if (!plan) throw new Error(`Unknown IAP plan ${id}`);
  return plan;
}

/** RevenueCat CustomerInfo subset used after restore / getCustomerInfo. */
export type CustomerInfoLike = {
  entitlements?: { active?: Record<string, unknown> | null } | null;
};

/**
 * react-native-purchases returns CustomerInfo; some wrappers nest it.
 */
export function customerInfoFromRestoreResult(result: unknown): CustomerInfoLike | null {
  if (!result || typeof result !== "object") return null;
  const record = result as { entitlements?: unknown; customerInfo?: unknown };
  if (record.entitlements && typeof record.entitlements === "object") {
    return record as CustomerInfoLike;
  }
  if (record.customerInfo && typeof record.customerInfo === "object") {
    return record.customerInfo as CustomerInfoLike;
  }
  return null;
}

export function activeEntitlementIdsFromCustomerInfo(
  customerInfo: CustomerInfoLike | null | undefined,
): string[] {
  return Object.keys(customerInfo?.entitlements?.active ?? {});
}

export function customerHasAnyActiveEntitlement(
  activeEntitlementIds: readonly string[],
): boolean {
  return activeEntitlementIds.length > 0;
}

/** Restore success only when RevenueCat reports at least one live entitlement. */
export function restoreFoundActiveEntitlement(
  customerInfo: CustomerInfoLike | null | undefined,
): boolean {
  return customerHasAnyActiveEntitlement(activeEntitlementIdsFromCustomerInfo(customerInfo));
}

/** Entitlement ids that mean "already subscribed to the requested plan". */
export function customerHasEntitlement(
  activeEntitlementIds: readonly string[],
  requiredEntitlement?: string,
): boolean {
  if (!requiredEntitlement) return false;
  const active = new Set(activeEntitlementIds);
  if (active.has(requiredEntitlement)) return true;
  // Boardroom / Pro aliases used by presentPaywallIfNeeded.
  if (
    requiredEntitlement === "Founder Mode Advisor Pro" ||
    requiredEntitlement === "founder_mode_advisor_pro" ||
    requiredEntitlement === "series_z_subscription"
  ) {
    return (
      active.has("Founder Mode Advisor Pro") ||
      active.has("founder_mode_advisor_pro") ||
      active.has("series_z_subscription")
    );
  }
  return false;
}
