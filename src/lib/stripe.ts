const STRIPE_JS_SRC = 'https://js.stripe.com/v3/';
const STRIPE_SCRIPT_ID = 'stripe-js-v3';

interface StripeRedirectResult {
  error?: {
    message?: string;
  };
}

interface StripeClient {
  redirectToCheckout(options: { sessionId: string }): Promise<StripeRedirectResult>;
}

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeClient;
  }
}

let stripeScriptPromise: Promise<void> | null = null;
let stripeClient: StripeClient | null = null;

export function getStripePublishableKey(): string {
  return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
}

export function hasStripePublishableKey(): boolean {
  return getStripePublishableKey().startsWith('pk_');
}

function loadStripeScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Stripe.js can only be loaded in the browser'));
  }

  if (window.Stripe) {
    return Promise.resolve();
  }

  if (!stripeScriptPromise) {
    stripeScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(STRIPE_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Stripe.js')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = STRIPE_SCRIPT_ID;
      script.src = STRIPE_JS_SRC;
      script.async = true;
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(new Error('Failed to load Stripe.js')), { once: true });
      document.head.appendChild(script);
    });
  }

  return stripeScriptPromise;
}

export async function getStripeClient(): Promise<StripeClient | null> {
  if (stripeClient) return stripeClient;

  const publishableKey = getStripePublishableKey();
  if (!publishableKey.startsWith('pk_')) {
    console.error('Stripe publishable key is missing or invalid. Set VITE_STRIPE_PUBLISHABLE_KEY.');
    return null;
  }

  await loadStripeScript();
  if (!window.Stripe) {
    console.error('Stripe.js loaded without exposing window.Stripe.');
    return null;
  }

  stripeClient = window.Stripe(publishableKey);
  return stripeClient;
}
