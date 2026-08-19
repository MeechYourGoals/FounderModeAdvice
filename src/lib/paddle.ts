import { supabase } from '@/integrations/supabase/client';

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

export function getPaddleEnvironment(): 'sandbox' | 'live' {
  return clientToken?.startsWith('test_') ? 'sandbox' : 'live';
}

let paddleInitialized = false;

export async function initializePaddle(): Promise<void> {
  if (paddleInitialized) return;
  if (!clientToken) throw new Error('VITE_PAYMENTS_CLIENT_TOKEN is not set');

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-paddle-sdk]');
    const onReady = () => {
      const paddleJsEnv = getPaddleEnvironment() === 'sandbox' ? 'sandbox' : 'production';
      window.Paddle.Environment.set(paddleJsEnv);
      window.Paddle.Initialize({ token: clientToken });
      paddleInitialized = true;
      resolve();
    };

    if (existing && window.Paddle) return onReady();
    const script = existing ?? document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.dataset.paddleSdk = 'true';
    script.onload = onReady;
    script.onerror = reject;
    if (!existing) document.head.appendChild(script);
  });
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  return (await getPaddleCheckoutConfig(priceId)).paddleId;
}

/**
 * Resolves the Paddle price plus a server-signed reference bound to the
 * authenticated user. The reference (not a client-supplied user id) is what the
 * webhook trusts when granting entitlements.
 */
export async function getPaddleCheckoutConfig(
  priceId: string,
): Promise<{ paddleId: string; checkoutRef: string }> {
  const environment = getPaddleEnvironment();
  const { data, error } = await supabase.functions.invoke('get-paddle-price', {
    body: { priceId, environment },
  });
  if (error || !data?.paddleId || !data?.checkoutRef) {
    throw new Error(`Failed to resolve price: ${priceId}`);
  }
  return { paddleId: data.paddleId as string, checkoutRef: data.checkoutRef as string };
}

