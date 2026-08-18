import { Capacitor } from '@capacitor/core';
import despia from 'despia-native';
import { supabase } from '@/integrations/supabase/client';
import type { SubscriptionTier, SubscriptionInfo, TierLimits } from '@/types/subscription';
import {
  TIER_LIMITS,
  REVENUECAT_ENTITLEMENTS,
  REVENUECAT_TIER_IDENTIFIERS,
  pickHighestSubscriptionTier,
} from '@/types/subscription';
import { isDespia, launchDespiaPaywall } from './despiaService';
import {
  isExpoShell,
  launchShellPaywall,
  openShellCustomerCenter,
  restoreShellPurchasesAndWait,
} from './expoShellService';




/** RevenueCat API key — platform-specific and mandatory for native builds. */
function getRevenueCatApiKey(): string {
  const platform = Capacitor.getPlatform();
  const apiKey = platform === 'ios'
    ? import.meta.env.VITE_REVENUECAT_IOS_API_KEY
    : platform === 'android'
      ? import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY
      : undefined;

  if (!apiKey) {
    throw new Error(`RevenueCat ${platform} API key is not configured. Set VITE_REVENUECAT_IOS_API_KEY or VITE_REVENUECAT_ANDROID_API_KEY before native release.`);
  }

  return apiKey;
}

function resolveTierFromIdentifiers(identifiers: Array<string | null | undefined>): SubscriptionTier {
  return pickHighestSubscriptionTier(
    identifiers
      .map((identifier) => identifier ? REVENUECAT_TIER_IDENTIFIERS[identifier] : undefined)
      .filter((tier): tier is SubscriptionTier => Boolean(tier)),
  );
}

function getDespiaSubscriptionManagementUrl(): string {
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent.toLowerCase();
  const isAndroidRuntime = Capacitor.getPlatform() === 'android' || /android/.test(userAgent);

  if (isAndroidRuntime) {
    return 'https://play.google.com/store/account/subscriptions?package=com.foundermodeadvice.app';
  }

  return 'https://apps.apple.com/account/subscriptions';
}

// RevenueCat SDK - conditionally loaded for native platforms
let Purchases: typeof import('@revenuecat/purchases-capacitor').Purchases | null = null;
// RevenueCat UI SDK - conditionally loaded for paywalls and customer center
let RevenueCatUI: typeof import('@revenuecat/purchases-capacitor-ui').RevenueCatUI | null = null;

// Initialize RevenueCat on native platforms
export async function initializeRevenueCat(userId: string): Promise<void> {
  if (isDespia()) {
    console.log('RevenueCat: Skipping initialization on Despia platform (native handling)');
    return;
  }

  if (isExpoShell()) {
    // The Expo shell owns the RevenueCat SDK; identification happens through
    // the shell bridge (see SubscriptionContext / identifyShellUser).
    console.log('RevenueCat: Skipping web initialization inside the Expo shell');
    return;
  }

  if (!Capacitor.isNativePlatform()) {
    console.log('RevenueCat: Skipping initialization on web platform');
    return;
  }

  try {
    const { Purchases: RevenueCatPurchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
    Purchases = RevenueCatPurchases;

    // Enable debug logging in development
    if (import.meta.env.DEV) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }

    const apiKey = getRevenueCatApiKey();

    await Purchases.configure({
      apiKey,
      appUserID: userId,
    });

    // Lazily load RevenueCatUI for paywalls and customer center
    try {
      const uiModule = await import('@revenuecat/purchases-capacitor-ui');
      RevenueCatUI = uiModule.RevenueCatUI;
      console.log('RevenueCat UI: Loaded successfully');
    } catch (uiError) {
      console.warn('RevenueCat UI: Not available (paywall/customer center disabled)', uiError);
    }

    console.log('RevenueCat: Initialized for user', userId);
  } catch (error) {
    console.error('RevenueCat: Failed to initialize', error);
  }
}

// Identify user with RevenueCat
export async function identifyUser(userId: string): Promise<void> {
  if (!Purchases || !Capacitor.isNativePlatform()) return;

  try {
    await Purchases.logIn({ appUserID: userId });
    console.log('RevenueCat: User identified', userId);
  } catch (error) {
    console.error('RevenueCat: Failed to identify user', error);
  }
}

/**
 * Resolve the user's subscription tier from RevenueCat entitlements.
 * Checks for the primary "Founder Mode Advisor Pro" entitlement first,
 * then falls back to legacy tier-specific entitlements.
 */
export async function getRevenueCatEntitlements(): Promise<SubscriptionTier> {
  if (!Purchases || !Capacitor.isNativePlatform()) {
    return 'free';
  }

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const entitlements = customerInfo.entitlements.active;

    return resolveTierFromIdentifiers(Object.keys(entitlements));
  } catch (error) {
    console.error('RevenueCat: Failed to get entitlements', error);
    return 'free';
  }
}

/** Get the raw CustomerInfo from RevenueCat */
export async function getCustomerInfo() {
  if (!Purchases || !Capacitor.isNativePlatform()) return null;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('RevenueCat: Failed to get customer info', error);
    return null;
  }
}

// Get available packages from RevenueCat
export async function getRevenueCatOfferings() {
  if (!Purchases || !Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const result = await Purchases.getOfferings();
    return (result as any)?.current ?? null;
  } catch (error) {
    console.error('RevenueCat: Failed to get offerings', error);
    return null;
  }
}

// Purchase a package via RevenueCat
export async function purchasePackage(packageId: string): Promise<boolean> {
  if (window.navigator.userAgent.includes('Despia')) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Use Despia native bridge for purchase
      despia(`revenuecat://purchase?external_id=${user.id}&product=${packageId}`);
      return true; // The actual success will be handled by the iapSuccess callback
    } catch (error) {
      console.error('Despia purchase failed', error);
      return false;
    }
  }

  if (isExpoShell()) {
    // The shell exposes purchases through the native RevenueCat paywall;
    // success arrives asynchronously via the iapSuccess callback.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    return launchShellPaywall(user.id, undefined, true);
  }

  if (!Purchases || !Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const result = await Purchases.getOfferings();
    const pkg = (result as any)?.current?.availablePackages?.find((p: any) => p.identifier === packageId);

    if (!pkg) {
      console.error('RevenueCat: Package not found', packageId);
      return false;
    }

    await Purchases.purchasePackage({ aPackage: pkg });

    // Sync to Supabase
    const tier = await getRevenueCatEntitlements();
    await syncSubscriptionToSupabase(tier);

    return true;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('RevenueCat: User cancelled purchase');
    } else {
      console.error('RevenueCat: Purchase failed', error);
    }
    return false;
  }
}

// ─── RevenueCat Paywall (native UI) ────────────────────────────────

export type PaywallResult = 'PURCHASED' | 'RESTORED' | 'CANCELLED' | 'OPENED' | 'ERROR';

/**
 * Present the RevenueCat native paywall.
 * Uses RevenueCatUI.presentPaywallIfNeeded when an entitlement is specified,
 * which auto-dismisses if the user already has the entitlement.
 */
export async function presentPaywall(
  requiredEntitlement: string = REVENUECAT_ENTITLEMENTS.PRO
): Promise<PaywallResult> {
  // Despia: use native bridge paywall
  if (isDespia()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'ERROR';
      await launchDespiaPaywall(user.id, 'default');
      return 'OPENED'; // Despia reports success later via native callbacks
    } catch {
      return 'ERROR';
    }
  }

  // Expo shell: native RevenueCat paywall in the shell; success arrives via iapSuccess.
  if (isExpoShell()) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'ERROR';
    return launchShellPaywall(user.id, requiredEntitlement) ? 'OPENED' : 'ERROR';
  }

  if (!RevenueCatUI || !Capacitor.isNativePlatform()) {
    console.warn('RevenueCat UI: Not available — cannot present paywall');
    return 'ERROR';
  }

  try {
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: requiredEntitlement,
    });

    const paywallResult = (result as any)?.result as string | undefined;

    if (paywallResult === 'PURCHASED' || paywallResult === 'RESTORED') {
      const tier = await getRevenueCatEntitlements();
      await syncSubscriptionToSupabase(tier);
      return paywallResult as PaywallResult;
    }

    return (paywallResult as PaywallResult) || 'CANCELLED';
  } catch (error) {
    console.error('RevenueCat UI: Paywall error', error);
    return 'ERROR';
  }
}

/**
 * Present the RevenueCat native paywall unconditionally (always shows).
 */
export async function presentPaywallAlways(): Promise<PaywallResult> {
  if (isDespia()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'ERROR';
      await launchDespiaPaywall(user.id, 'default');
      return 'OPENED';
    } catch {
      return 'ERROR';
    }
  }

  if (isExpoShell()) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'ERROR';
    return launchShellPaywall(user.id, undefined, true) ? 'OPENED' : 'ERROR';
  }

  if (!RevenueCatUI || !Capacitor.isNativePlatform()) {
    return 'ERROR';
  }

  try {
    const result = await RevenueCatUI.presentPaywall();
    const paywallResult = (result as any)?.result as string | undefined;

    if (paywallResult === 'PURCHASED' || paywallResult === 'RESTORED') {
      const tier = await getRevenueCatEntitlements();
      await syncSubscriptionToSupabase(tier);
    }

    return (paywallResult as PaywallResult) || 'CANCELLED';
  } catch (error) {
    console.error('RevenueCat UI: Paywall error', error);
    return 'ERROR';
  }
}

// ─── RevenueCat Customer Center ────────────────────────────────────

/**
 * Present the RevenueCat Customer Center for subscription management.
 * This provides a self-service UI for users to manage, cancel, or restore subscriptions.
 */
export async function presentCustomerCenter(): Promise<void> {
  if (isExpoShell()) {
    // Shell presents the RevenueCat Customer Center natively.
    openShellCustomerCenter();
    return;
  }

  if (isDespia()) {
    try {
      // Despia does not expose the RevenueCatUI Customer Center object to JS.
      // Route users to the platform-native subscription management screen instead.
      despia(getDespiaSubscriptionManagementUrl());
    } catch (error) {
      console.error('Despia: Failed to open subscription management', error);
    }
    return;
  }

  if (!RevenueCatUI || !Capacitor.isNativePlatform()) {
    console.warn('RevenueCat UI: Customer Center not available');
    return;
  }

  try {
    await RevenueCatUI.presentCustomerCenter();
    // After customer center interaction, re-sync subscription state
    const tier = await getRevenueCatEntitlements();
    await syncSubscriptionToSupabase(tier);
  } catch (error) {
    console.error('RevenueCat UI: Customer Center error', error);
  }
}

// Restore purchases via RevenueCat
export async function restorePurchases(): Promise<SubscriptionTier> {
  if (isExpoShell()) {
    // Shell restores natively and acks over the bridge. Throw on failure or
    // timeout so callers show an error toast instead of a false "restored".
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sign in to restore purchases');

    const ok = await restoreShellPurchasesAndWait(user.id);
    if (!ok) throw new Error('Restore did not complete');

    // Post-restore only: the edge function re-verifies with RevenueCat and
    // writes the verified tier (the fallback argument is never trusted).
    await syncSubscriptionToSupabase('free');
    const info = await getSubscriptionInfo();
    return info?.tier ?? 'free';
  }

  if (!Purchases || !Capacitor.isNativePlatform()) {
    throw new Error('Restore is only available in the app');
  }

  try {
    await Purchases.restorePurchases();
    const tier = await getRevenueCatEntitlements();
    await syncSubscriptionToSupabase(tier);
    return tier;
  } catch (error) {
    console.error('RevenueCat: Failed to restore purchases', error);
    throw error instanceof Error ? error : new Error('Restore failed');
  }
}

// Sync subscription status to Supabase via verified server-side edge function.
// The edge function re-verifies the user's entitlement with RevenueCat using
// REVENUECAT_API_KEY before writing — never trust the client-supplied tier.
export async function syncSubscriptionToSupabase(tier: SubscriptionTier): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.functions.invoke('sync-revenuecat-subscription', {
      body: { fallbackTier: tier },
    });

    if (error) {
      console.error('Failed to sync subscription to backend', error);
    }
  } catch (error) {
    console.error('Error syncing subscription', error);
  }
}


// Get subscription info from Supabase (direct queries, no RPC)
export async function getSubscriptionInfo(
  knownUser?: { id: string; email?: string | null } | null,
): Promise<SubscriptionInfo | null> {
  try {
    // Prefer the already-resolved session user. `getUser()` hits the Auth
    // server and can deadlock with onAuthStateChange / concurrent requests
    // (https://github.com/supabase/gotrue-js/issues/762).
    const user =
      knownUser ??
      (await supabase.auth.getSession()).data.session?.user ??
      null;
    if (!user) return null;



    // Get subscription tier
    const { data: subscription } = await supabase
      .from('user_subscriptions' as any)
      .select('*')
      .eq('user_id', user.id)
      .single();

    const tier: SubscriptionTier = (subscription as any)?.tier || 'free';
    const tierLimits = TIER_LIMITS[tier];

    // Get profiles count
    const { count: profilesUsed } = await supabase
      .from('user_startup_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get bookmarks count
    const { count: bookmarksUsed } = await supabase
      .from('bookmarked_episodes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get monthly analyses count
    const monthYear = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const { data: usage } = await supabase
      .from('user_monthly_usage' as any)
      .select('analyses_count')
      .eq('user_id', user.id)
      .eq('month_year', monthYear)
      .single();

    return {
      tier,
      limits: {
        profiles: { max: tierLimits.profiles.max, used: profilesUsed || 0 },
        bookmarks: { max: tierLimits.bookmarks.max, used: bookmarksUsed || 0 },
        analyses: { max: tierLimits.analyses.max, used: (usage as any)?.analyses_count || 0 },
      },
      isActive: true,
      currentPeriodEnd: (subscription as any)?.current_period_end,
      cancelAtPeriodEnd: (subscription as any)?.cancel_at_period_end,
    };
  } catch (error) {
    console.error('Error getting subscription info', error);
    return null;
  }
}

// Check if user can perform an action based on limits
export function canPerformAction(
  limits: TierLimits,
  action: 'profile' | 'bookmark' | 'analysis'
): { allowed: boolean; message?: string } {
  switch (action) {
    case 'profile':
      if (limits.profiles.used >= limits.profiles.max) {
        return {
          allowed: false,
          message: `You've reached your limit of ${limits.profiles.max} profile${limits.profiles.max > 1 ? 's' : ''}. Upgrade to add more.`,
        };
      }
      break;
    case 'bookmark':
      if (limits.bookmarks.used >= limits.bookmarks.max) {
        return {
          allowed: false,
          message: `You've reached your limit of ${limits.bookmarks.max} bookmarks. Upgrade for more.`,
        };
      }
      break;
    case 'analysis':
      if (limits.analyses.used >= limits.analyses.max) {
        return {
          allowed: false,
          message: `You've used your ${limits.analyses.max} free analyses this month. Upgrade to analyze more videos.`,
        };
      }
      break;
  }
  return { allowed: true };
}

// Increment analysis count via SECURITY DEFINER RPC (writes are not allowed
// directly from the client — RLS only permits service_role / SECURITY DEFINER).
export async function incrementAnalysisCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase.rpc('increment_analysis_count', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Failed to increment analysis count', error);
      return 0;
    }

    return (data as number) ?? 0;
  } catch (error) {
    console.error('Error incrementing analysis count', error);
    return 0;
  }
}


// Get Stripe checkout URL (for web payments)
export async function getStripeCheckoutUrl(priceId: string): Promise<string | null> {
  if (Capacitor.isNativePlatform() || isDespia() || isExpoShell()) {
    console.warn('Stripe checkout blocked in native app context; use RevenueCat/Despia IAP instead.');
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId },
    });

    if (error) {
      console.error('Failed to create checkout session', error);
      return null;
    }

    return data?.url || null;
  } catch (error) {
    console.error('Error creating checkout session', error);
    return null;
  }
}

// Get Stripe customer portal URL
export async function getStripePortalUrl(): Promise<string | null> {
  if (Capacitor.isNativePlatform() || isDespia() || isExpoShell()) {
    console.warn('Stripe customer portal blocked in native app context; use native subscription management instead.');
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: {},
    });

    if (error) {
      console.error('Failed to create portal session', error);
      return null;
    }

    return data?.url || null;
  } catch (error) {
    console.error('Error creating portal session', error);
    return null;
  }
}


export async function restoreDespiaPurchases(): Promise<any[]> {
  const data = await despia('getpurchasehistory://', ['restoredData']);
  return (data as any).restoredData || [];
}

export async function getDespiaEntitlements(): Promise<SubscriptionTier> {
  try {
    const restoredData = await restoreDespiaPurchases();

    // Filter for active purchases
    const activePurchases = restoredData.filter((p: any) => p.isActive);

    return resolveTierFromIdentifiers(
      activePurchases.flatMap((purchase: any) => [
        purchase.entitlementId,
        purchase.productIdentifier,
        purchase.productId,
      ]),
    );
  } catch (error) {
    console.error('Failed to get Despia entitlements', error);
    return 'free';
  }
}
