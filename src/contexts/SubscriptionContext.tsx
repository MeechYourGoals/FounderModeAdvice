import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
import { STRIPE_PRICE_IDS, REVENUECAT_ENTITLEMENTS } from '@/types/subscription';
import type { PaywallResult } from '@/services/subscriptionService';

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
  restorePurchases: () => Promise<void>;
  /** Present RevenueCat native paywall (only shows if user lacks the entitlement) */
  presentPaywall: () => Promise<PaywallResult>;
  /** Present RevenueCat native paywall unconditionally */
  presentPaywallAlways: () => Promise<PaywallResult>;
  /** Present RevenueCat Customer Center for subscription management */
  presentCustomerCenter: () => Promise<void>;
  isNative: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isDespia } = useDespia();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();
  const isDespiaApp = isDespia();
  const isShellApp = isExpoShell();

  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
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

      const info = await getSubscriptionInfo();
      setSubscription(info);
    } catch (err) {
      console.error('Failed to fetch subscription', err);
      setError('Failed to load subscription info');
      // Default to free tier on error (limits mirror TIER_LIMITS.free)
      setSubscription({
        tier: 'free',
        limits: {
          profiles: { max: 1, used: 0 },
          bookmarks: { max: 5, used: 0 },
          analyses: { max: 3, used: 0 },
        },
        isActive: true,
      });
    } finally {
      setLoading(false);
    }
  }, [user, isNative, isDespiaApp, isShellApp]);

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

  // Initialize RevenueCat and load subscription on mount
  useEffect(() => {
    async function init() {
      if (user && isNative && !isDespiaApp) {
        await initializeRevenueCat(user.id);
        await identifyUser(user.id);
      }
      if (user && isShellApp) {
        // Configure RevenueCat/OneSignal in the shell with the Supabase user id
        // so server-side entitlement verification keys off the same identity.
        identifyShellUser(user.id);
      }
      await refreshSubscription();
    }
    init();
  }, [user, isNative, isDespiaApp, isShellApp, refreshSubscription]);

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

  const upgradeTo = useCallback(async (tier: SubscriptionTier) => {
    if (tier === 'free') return;

    if (isDespiaApp || isNative || isShellApp) {
      // Native: RevenueCat paywall.
      const result = await presentPaywallService(REVENUECAT_ENTITLEMENTS.PRO);
      if (result === 'PURCHASED' || result === 'RESTORED') {
        await refreshSubscription();
      }
    } else {
      // Web: Paddle overlay checkout.
      const { initializePaddle, getPaddlePriceId } = await import('@/lib/paddle');
      await initializePaddle();
      const priceId = tier === 'seed' ? 'c_suite_monthly' : 'boardroom_monthly';
      const paddlePriceId = await getPaddlePriceId(priceId);
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: user?.email ? { email: user.email } : undefined,
        customData: { userId: user?.id ?? '' },
        settings: {
          displayMode: 'overlay',
          successUrl: `${window.location.origin}/?checkout=success`,
          allowLogout: false,
          variant: 'one-page',
        },
      });
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

  const handleRestorePurchases = useCallback(async () => {
    if (isDespiaApp) {
       const tier = await getDespiaEntitlements();
       await syncSubscriptionToSupabase(tier);
       await refreshSubscription();
    } else {
       await restorePurchases();
       await refreshSubscription();
    }
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
