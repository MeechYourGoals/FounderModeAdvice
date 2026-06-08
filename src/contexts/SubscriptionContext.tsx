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

      const info = await getSubscriptionInfo();
      setSubscription(info);
    } catch (err) {
      console.error('Failed to fetch subscription', err);
      setError('Failed to load subscription info');
      // Default to free tier on error
      setSubscription({
        tier: 'free',
        limits: {
          profiles: { max: 1, used: 0 },
          bookmarks: { max: 5, used: 0 },
          analyses: { max: 4, used: 0 },
        },
        isActive: true,
      });
    } finally {
      setLoading(false);
    }
  }, [user, isNative, isDespiaApp]);

  // Despia Native reports purchase/restore completion through global callbacks.
  // Register them in one place so callbacks cannot overwrite each other.
  useEffect(() => {
    if (!isDespiaApp) return;

    const handleNativePurchaseSuccess = (transactionData?: unknown) => {
      console.log('Despia: Purchase callback received, refreshing subscription', transactionData);
      void refreshSubscription();
    };

    window.onRevenueCatPurchase = handleNativePurchaseSuccess;
    window.iapSuccess = handleNativePurchaseSuccess;

    return () => {
      window.onRevenueCatPurchase = undefined;
      window.iapSuccess = undefined;
    };
  }, [isDespiaApp, refreshSubscription]);

  // Initialize RevenueCat and load subscription on mount
  useEffect(() => {
    async function init() {
      if (user && isNative && !isDespiaApp) {
        await initializeRevenueCat(user.id);
        await identifyUser(user.id);
      }
      await refreshSubscription();
    }
    init();
  }, [user, isNative, isDespiaApp, refreshSubscription]);

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

    if (isDespiaApp || isNative) {
      // On native / Despia — present the RevenueCat paywall.
      // The paywall shows all available packages and handles purchase natively.
      const result = await presentPaywallService(REVENUECAT_ENTITLEMENTS.PRO);
      if (result === 'PURCHASED' || result === 'RESTORED') {
        await refreshSubscription();
      }
    } else {
      // Use Stripe for web purchases
      const priceId = tier === 'seed'
        ? STRIPE_PRICE_IDS.SEED_MONTHLY
        : STRIPE_PRICE_IDS.SERIES_Z_MONTHLY;

      const checkoutUrl = await getStripeCheckoutUrl(priceId);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    }
  }, [isNative, isDespiaApp, refreshSubscription]);

  const manageSubscription = useCallback(async () => {
    if (isDespiaApp || isNative) {
      // Use RevenueCat Customer Center for native subscription management
      await presentCustomerCenterService();
      await refreshSubscription();
    } else {
      // Redirect to Stripe Customer Portal
      const portalUrl = await getStripePortalUrl();
      if (portalUrl) {
        window.location.href = portalUrl;
      }
    }
  }, [isNative, isDespiaApp, refreshSubscription]);

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
        isNative: isNative || isDespiaApp,
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
