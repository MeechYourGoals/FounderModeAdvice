import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { useDespia } from '@/hooks/use-despia';
import {
  initializeRevenueCat,
  identifyUser,
  getRevenueCatEntitlements,
  getSubscriptionInfo,
  canPerformAction,
  incrementAnalysisCount,
  getStripeCheckoutUrl,
  getStripePortalUrl,
  restorePurchases,
  getDespiaEntitlements,
  syncSubscriptionToSupabase,
  presentPaywall as presentPaywallService,
  presentPaywallAlways as presentPaywallAlwaysService,
  presentCustomerCenter as presentCustomerCenterService,
} from '@/services/subscriptionService';
import { isExpoShell, identifyShellUser } from '@/services/expoShellService';
import type { SubscriptionInfo, SubscriptionTier } from '@/types/subscription';
import { STRIPE_PRICE_IDS, REVENUECAT_ENTITLEMENTS, TIER_LIMITS } from '@/types/subscription';
import type { PaywallResult } from '@/services/subscriptionService';
import { isTimeoutError, withTimeout } from '@/lib/asyncTimeout';

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  canCreateProfile: () => { allowed: boolean; message?: string };
  canCreateBookmark: () => { allowed: boolean; message?: string };
  canAnalyzeVideo: () => { allowed: boolean; message?: string };
  trackAnalysis: () => Promise<void>;
  upgradeTo: (tier: SubscriptionTier) => Promise<void>;
  manageSubscription: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  /** Present RevenueCat native paywall (only shows if user lacks the entitlement) */
  presentPaywall: () => Promise<PaywallResult>;
  /** Present RevenueCat native paywall unconditionally */
  presentPaywallAlways: () => Promise<PaywallResult>;
  /** Present RevenueCat Customer Center for subscription management */
  presentCustomerCenter: () => Promise<void>;
  isNative: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

const SUBSCRIPTION_FETCH_TIMEOUT_MS = 10_000;

const FREE_FALLBACK: SubscriptionInfo = {
  tier: 'free',
  limits: {
    profiles: { max: TIER_LIMITS.free.profiles.max, used: 0 },
    bookmarks: { max: TIER_LIMITS.free.bookmarks.max, used: 0 },
    analyses: { max: TIER_LIMITS.free.analyses.max, used: 0 },
  },
  isActive: true,
};

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const { isDespia } = useDespia();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();
  const isDespiaApp = isDespia();
  const isShellApp = isExpoShell();
  const hasSnapshotRef = useRef(false);

  const refreshSubscription = useCallback(async () => {
    if (!userId) {
      hasSnapshotRef.current = false;
      setSubscription(null);
      setLoading(false);
      return;
    }

    // Foreground / token-refresh re-reads must not flip `loading` back to true
    // — Discover (and Account/Favorites) treat that as a full-page spinner.
    const blocking = !hasSnapshotRef.current;
    try {
      if (blocking) setLoading(true);
      setError(null);

      // On native platforms, also check RevenueCat entitlements
      if (isNative && !isDespiaApp) {
        const tier = await getRevenueCatEntitlements();
        await syncSubscriptionToSupabase(tier);
      } else if (isDespiaApp) {
        const tier = await getDespiaEntitlements();
        await syncSubscriptionToSupabase(tier);
      }
      // Expo shell: no RevenueCat sync on plain refreshes. The edge function
      // only knows RevenueCat, so syncing here would overwrite a web
      // (Paddle/Stripe) subscription with "free" just for opening the app.
      // Sync happens only after a shell purchase/restore (see the purchase
      // callback below and restorePurchases in subscriptionService).

      const info = await withTimeout(
        getSubscriptionInfo({ id: userId, email: userEmail }),
        SUBSCRIPTION_FETCH_TIMEOUT_MS,
        'getSubscriptionInfo',
      );
      setSubscription(info);
      hasSnapshotRef.current = true;
    } catch (err) {
      console.error('Failed to fetch subscription', err);
      setError('Failed to load subscription info');
      if (isTimeoutError(err)) {
        // Keep whatever we already have. Inventing a free tier here would
        // show the upgrade wall to a Boardroom member whose fetch hung.
        setSubscription((current) => current);
      } else {
        setSubscription((current) => current ?? FREE_FALLBACK);
        hasSnapshotRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail, isNative, isDespiaApp, isShellApp]);

  // Despia and the Expo shell report purchase/restore completion through global
  // callbacks. Register them in one place so callbacks cannot overwrite each other.
  useEffect(() => {
    if (!isDespiaApp && !isShellApp) return;

    const handleNativePurchaseSuccess = (transactionData?: unknown) => {
      console.log('Native purchase callback received, refreshing subscription', transactionData);
      void (async () => {
        // Shell purchase/restore just changed RevenueCat state — have the edge
        // function re-verify and persist the new tier before reading it back.
        if (isShellApp) await syncSubscriptionToSupabase('free');
        await refreshSubscription();
      })();
    };

    window.onRevenueCatPurchase = handleNativePurchaseSuccess;
    window.iapSuccess = handleNativePurchaseSuccess;

    return () => {
      window.onRevenueCatPurchase = undefined;
      window.iapSuccess = undefined;
    };
  }, [isDespiaApp, isShellApp, refreshSubscription]);

  // Entitlement freshness on foreground: renewals, cancellations, billing
  // issues, and cross-device purchases land in Supabase (RevenueCat webhook /
  // Paddle webhook), so re-reading on every return to the app keeps gating
  // honest without touching the store SDKs. Throttled to avoid visibility
  // flapping hammering the backend.
  const lastForegroundRefreshRef = useRef(0);
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastForegroundRefreshRef.current < 30_000) return;
      lastForegroundRefreshRef.current = now;
      void refreshSubscription();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [userId, refreshSubscription]);

  // Initialize RevenueCat and load subscription on mount
  useEffect(() => {
    async function init() {
      if (userId && isNative && !isDespiaApp) {
        await initializeRevenueCat(userId);
        await identifyUser(userId);
      }
      if (userId && isShellApp) {
        // Configure RevenueCat/OneSignal in the shell with the Supabase user id
        // so server-side entitlement verification keys off the same identity.
        identifyShellUser(userId);
      }
      await refreshSubscription();
    }
    void init();
  }, [userId, isNative, isDespiaApp, isShellApp, refreshSubscription]);

  const canCreateProfile = useCallback(() => {
    if (!subscription?.limits) {
      return { allowed: false, message: 'Loading subscription...' };
    }
    return canPerformAction(subscription.limits, 'profile');
  }, [subscription]);

  const canCreateBookmark = useCallback(() => {
    if (!subscription?.limits) {
      return { allowed: false, message: 'Loading subscription...' };
    }
    return canPerformAction(subscription.limits, 'bookmark');
  }, [subscription]);

  const canAnalyzeVideo = useCallback(() => {
    if (!subscription?.limits) {
      return { allowed: false, message: 'Loading subscription...' };
    }
    return canPerformAction(subscription.limits, 'analysis');
  }, [subscription]);

  const trackAnalysis = useCallback(async () => {
    await incrementAnalysisCount();
    await refreshSubscription();
  }, [refreshSubscription]);

  // One purchase flow at a time — a double-tap on any Upgrade button must
  // not stack paywalls or checkouts.
  const upgradeInFlightRef = useRef(false);

  const upgradeTo = useCallback(async (tier: SubscriptionTier) => {
    if (tier === 'free') return;
    if (upgradeInFlightRef.current) return;
    upgradeInFlightRef.current = true;
    try {
      if (isDespiaApp || isNative || isShellApp) {
        // Native: RevenueCat paywall.
        const result = await presentPaywallService(REVENUECAT_ENTITLEMENTS.PRO);
        if (result === 'PURCHASED' || result === 'RESTORED') {
          await refreshSubscription();
        }
      } else {
        // Web: Paddle overlay checkout.
        const { initializePaddle, getPaddleCheckoutConfig } = await import('@/lib/paddle');
        await initializePaddle();
        const priceId = tier === 'seed' ? 'c_suite_monthly' : 'boardroom_monthly';
        const { paddleId: paddlePriceId, checkoutRef } = await getPaddleCheckoutConfig(priceId);
        window.Paddle.Checkout.open({
          items: [{ priceId: paddlePriceId, quantity: 1 }],
          customer: user?.email ? { email: user.email } : undefined,
          customData: { ref: checkoutRef },

          settings: {
            displayMode: 'overlay',
            successUrl: `${window.location.origin}/?checkout=success`,
            allowLogout: false,
            variant: 'one-page',
          },
        });
      }
    } finally {
      upgradeInFlightRef.current = false;
    }
  }, [isNative, isDespiaApp, isShellApp, refreshSubscription, user]);

  const manageSubscription = useCallback(async () => {
    if (isDespiaApp || isNative || isShellApp) {
      // Use RevenueCat Customer Center for native subscription management
      await presentCustomerCenterService();
      await refreshSubscription();
    } else {
      // Redirect to the billing portal (Paddle for web purchases; Stripe for
      // legacy customers — create-portal-session picks the right provider).
      const portalUrl = await getStripePortalUrl();
      if (portalUrl) {
        window.location.href = portalUrl;
      } else {
        // Surface to the caller (Account shows a toast) instead of silently doing nothing.
        throw new Error('No billing portal available for this account');
      }
    }
  }, [isNative, isDespiaApp, isShellApp, refreshSubscription]);

  const handleRestorePurchases = useCallback(async (): Promise<boolean> => {
    if (isDespiaApp) {
       const tier = await getDespiaEntitlements();
       await syncSubscriptionToSupabase(tier);
       await refreshSubscription();
       return true;
    }
    await restorePurchases();
    await refreshSubscription();
    return true;
  }, [isDespiaApp, refreshSubscription]);

  const handlePresentPaywall = useCallback(async (): Promise<PaywallResult> => {
    const result = await presentPaywallService(REVENUECAT_ENTITLEMENTS.PRO);
    if (result === 'PURCHASED' || result === 'RESTORED') {
      await refreshSubscription();
    }
    return result;
  }, [refreshSubscription]);

  const handlePresentPaywallAlways = useCallback(async (): Promise<PaywallResult> => {
    const result = await presentPaywallAlwaysService();
    if (result === 'PURCHASED' || result === 'RESTORED') {
      await refreshSubscription();
    }
    return result;
  }, [refreshSubscription]);

  const handlePresentCustomerCenter = useCallback(async () => {
    await presentCustomerCenterService();
    await refreshSubscription();
  }, [refreshSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        error,
        refreshSubscription,
        canCreateProfile,
        canCreateBookmark,
        canAnalyzeVideo,
        trackAnalysis,
        upgradeTo,
        manageSubscription,
        restorePurchases: handleRestorePurchases,
        presentPaywall: handlePresentPaywall,
        presentPaywallAlways: handlePresentPaywallAlways,
        presentCustomerCenter: handlePresentCustomerCenter,
        isNative: isNative || isDespiaApp || isShellApp,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
