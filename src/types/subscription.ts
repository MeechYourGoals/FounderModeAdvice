export type SubscriptionTier = 'free' | 'seed' | 'series_z';

export type BillingPeriod = 'monthly' | 'yearly' | 'lifetime';

export interface TierLimits {
  profiles: { max: number; used: number };
  bookmarks: { max: number; used: number };
  analyses: { max: number; used: number };
}

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  limits: TierLimits;
  isActive: boolean;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  revenuecat_app_user_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserMonthlyUsage {
  id: string;
  user_id: string;
  month_year: string;
  analyses_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Sentinel used throughout the app to represent an "unlimited" allowance.
 * A real usage count will always be below this, so limit checks naturally pass.
 * UI helpers render this value as "Unlimited" instead of a number.
 */
export const UNLIMITED = 9999;

export function isUnlimited(max: number): boolean {
  return max >= UNLIMITED;
}

/** Tiers that include the transcript-grounded "Ask this video" AI chat feature. */
export function hasVideoChat(tier: SubscriptionTier): boolean {
  return TIER_LIMITS[tier].videoChat;
}

/** Tiers that can export analyses and chat summaries (PDF / CSV / JSON / Markdown). */
export function hasExport(tier: SubscriptionTier): boolean {
  return TIER_LIMITS[tier].exports;
}

/** Tiers that can invite collaborators to share insight folders. */
export function hasSharing(tier: SubscriptionTier): boolean {
  return TIER_LIMITS[tier].sharing;
}

/** Tiers that can submit one video across multiple profiles in one action. */
export function canBatchAnalyzeProfiles(tier: SubscriptionTier): boolean {
  return TIER_LIMITS[tier].batchProfileAnalysis;
}

export const TIER_LIMITS: Record<SubscriptionTier, Omit<TierLimits, 'profiles' | 'bookmarks' | 'analyses'> & {
  profiles: { max: number };
  bookmarks: { max: number };
  bookmarksPerProfile: number;
  analyses: { max: number };
  /** Whether the plan unlocks the "Ask this video" AI chat. */
  videoChat: boolean;
  /** Whether the plan unlocks exporting analyses and chat summaries. */
  exports: boolean;
  /** Whether the plan unlocks inviting collaborators to insight folders/analyses. */
  sharing: boolean;
  /** Whether one URL submission can target multiple profiles. */
  batchProfileAnalysis: boolean;
}> = {
  free: {
    profiles: { max: 1 },
    bookmarks: { max: 5 },
    bookmarksPerProfile: 5,
    analyses: { max: 3 },
    videoChat: false,
    exports: false,
    sharing: false,
    batchProfileAnalysis: false,
  },
  // "The C-Suite" — entry paid plan.
  seed: {
    profiles: { max: 5 },
    bookmarks: { max: 30 },
    bookmarksPerProfile: 10,
    analyses: { max: 20 },
    videoChat: false,
    exports: false,
    sharing: false,
    batchProfileAnalysis: false,
  },
  // "The Boardroom" — power plan. Everything unlimited + Ask-the-video AI chat + export.
  series_z: {
    profiles: { max: UNLIMITED },
    bookmarks: { max: UNLIMITED },
    bookmarksPerProfile: UNLIMITED,
    analyses: { max: UNLIMITED },
    videoChat: true,
    exports: true,
    sharing: true,
    batchProfileAnalysis: true,
  },
};

export interface TierPricing {
  name: string;
  displayName: string;
  price: number;
  priceDisplay: string;
  yearlyPrice?: number;
  yearlyPriceDisplay?: string;
  lifetimePrice?: number;
  lifetimePriceDisplay?: string;
  features: string[];
  recommended?: boolean;
}

export const TIER_PRICING: Record<SubscriptionTier, TierPricing> = {
  free: {
    name: 'free',
    displayName: 'Free',
    price: 0,
    priceDisplay: 'Free',
    features: [
      '1 business profile',
      '3 video analyses per month',
      'Universal, industry-aware insights',
      'Organize analyses into private folders',
    ],
  },
  seed: {
    name: 'seed',
    displayName: 'The C-Suite',
    price: 9.99,
    priceDisplay: '$9.99/month',
    features: [
      '20 video analyses per month',
      'Up to 5 business profiles',
      'Personalized insights by industry & stage',
      'One analysis target per submission',
      'Organize analyses into private folders',
    ],
    recommended: true,
  },
  series_z: {
    name: 'series_z',
    displayName: 'The Boardroom',
    price: 19.99,
    priceDisplay: '$19.99/month',
    features: [
      'Unlimited video analyses',
      'Unlimited business profiles',
      'Run one video across multiple profiles in one go',
      'Ask-the-video AI chat (unlimited)',
      'Personalized insights by industry & stage',
      'Invite teammates & advisors to view insights',
      'Priority feature access',
      'Best for multiple ventures & clients',
    ],
  },
};

/** RevenueCat entitlement identifiers — must match your RevenueCat dashboard */
export const REVENUECAT_ENTITLEMENTS = {
  /** Primary entitlement for the app — unlocks all Pro features */
  PRO: 'Founder Mode Advisor Pro',
  /** Stable slug alias for dashboards that reject spaces in entitlement identifiers. */
  PRO_SLUG: 'founder_mode_advisor_pro',
  /** Legacy: maps to Seed tier */
  SEED: 'seed_subscription',
  /** Legacy: maps to Series Z tier */
  SERIES_Z: 'series_z_subscription',
} as const;

/**
 * RevenueCat entitlement/product identifiers mapped to internal subscription tiers.
 * Keep this map in sync with `supabase/functions/sync-revenuecat-subscription/index.ts`
 * and RevenueCat Offerings. The edge function is the source of truth for writes;
 * this client-side map is only for immediate native UX refreshes.
 */
export const REVENUECAT_TIER_IDENTIFIERS: Record<string, SubscriptionTier> = {
  [REVENUECAT_ENTITLEMENTS.PRO]: 'series_z',
  [REVENUECAT_ENTITLEMENTS.PRO_SLUG]: 'series_z',
  [REVENUECAT_ENTITLEMENTS.SERIES_Z]: 'series_z',
  series_z: 'series_z',
  boardroom: 'series_z',
  series_z_monthly: 'series_z',
  [REVENUECAT_ENTITLEMENTS.SEED]: 'seed',
  seed: 'seed',
  c_suite: 'seed',
  seed_monthly: 'seed',
};

export function pickHighestSubscriptionTier(tiers: SubscriptionTier[]): SubscriptionTier {
  if (tiers.includes('series_z')) return 'series_z';
  if (tiers.includes('seed')) return 'seed';
  return 'free';
}

/**
 * RevenueCat product identifiers — must match App Store Connect / Google Play Console.
 * These map to your RevenueCat Offerings > Packages configuration.
 */
export const REVENUECAT_PRODUCTS = {
  SEED_MONTHLY: 'seed_monthly',
  SERIES_Z_MONTHLY: 'series_z_monthly',
} as const;

/** RevenueCat offering identifiers */
export const REVENUECAT_OFFERINGS = {
  DEFAULT: 'default',
} as const;

export const STRIPE_PRICE_IDS = {
  SEED_MONTHLY: import.meta.env.VITE_STRIPE_SEED_PRICE_ID || 'price_seed_monthly',
  SERIES_Z_MONTHLY: import.meta.env.VITE_STRIPE_SERIES_Z_PRICE_ID || 'price_series_z_monthly',
} as const;
