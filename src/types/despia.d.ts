export {};

/** Minimal surface of the PostHog web SDK we use (loaded on demand via CDN). */
interface PostHogWeb {
  init: (apiKey: string, options?: Record<string, unknown>) => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset: (resetDeviceId?: boolean) => void;
  opt_in_capturing: () => void;
  opt_out_capturing: () => void;
  isFeatureEnabled?: (key: string) => boolean | undefined;
  getFeatureFlag?: (key: string) => boolean | string | undefined;
  __SV?: number;
  [key: string]: unknown;
}

declare global {
  interface Window {
    /** Despia Native: Called when a RevenueCat purchase completes successfully */
    onRevenueCatPurchase?: () => void;
    /** Despia Native: Called when an in-app purchase completes successfully */
    iapSuccess?: (transactionData?: unknown) => void;
    /** PostHog web SDK — present after analytics.ts loads it in web/Capacitor runtimes. */
    posthog?: PostHogWeb;
  }
}
