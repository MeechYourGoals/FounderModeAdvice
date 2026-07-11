import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

// Guard against customData.userId spoofing: verify the Paddle customer's
// email actually matches the auth user for the claimed userId. Without this,
// anyone can open Paddle checkout from devtools with a victim's UUID and
// grant/strip a paid plan on their account.
async function verifyUserOwnsCustomer(
  userId: string,
  customerId: string,
  env: PaddleEnv,
): Promise<boolean> {
  try {
    const { data: authUser, error } = await getSupabase().auth.admin.getUserById(userId);
    if (error || !authUser?.user?.email) return false;
    const userEmail = authUser.user.email.toLowerCase().trim();

    const res = await gatewayFetch(env, `/customers/${encodeURIComponent(customerId)}`);
    if (!res.ok) return false;
    const body = await res.json();
    const customerEmail = String(body?.data?.email ?? '').toLowerCase().trim();
    if (!customerEmail) return false;
    return customerEmail === userEmail;
  } catch (e) {
    console.error('verifyUserOwnsCustomer failed', e);
    return false;
  }
}

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }
  return _supabase;
}

// Map human-readable Paddle product IDs to in-app subscription tiers.
function productIdToTier(productId: string): 'free' | 'seed' | 'series_z' {
  if (productId === 'c_suite') return 'seed';
  if (productId === 'boardroom') return 'series_z';
  return 'free';
}

async function upsertSubscription(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData, scheduledChange } = data;
  const userId = customData?.userId;
  if (!userId) {
    console.warn('Subscription event without customData.userId — skipping');
    return;
  }

  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn('Skipping subscription: missing importMeta.externalId');
    return;
  }

  const tier = productIdToTier(productId);

  // Record the raw subscription in every environment (audit trail)…
  await getSupabase().from('subscriptions').upsert(
    {
      user_id: userId,
      paddle_subscription_id: id,
      paddle_customer_id: customerId,
      product_id: productId,
      price_id: priceId,
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === 'cancel',
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'paddle_subscription_id' },
  );

  // …but only mirror into user_subscriptions (the table all feature gating
  // reads) for live purchases. Sandbox test-card purchases granting real
  // entitlements is an abuse vector; set PADDLE_ALLOW_SANDBOX_ENTITLEMENTS=true
  // on a staging project to test paid flows end-to-end.
  if (env !== 'live' && Deno.env.get('PADDLE_ALLOW_SANDBOX_ENTITLEMENTS') !== 'true') {
    console.log(`Skipping user_subscriptions mirror for ${env} subscription ${id}`);
    return;
  }

  const isActive = status === 'active' || status === 'trialing';
  await getSupabase().from('user_subscriptions').upsert(
    {
      user_id: userId,
      tier: isActive ? tier : 'free',
      status: isActive ? 'active' : status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

async function handleCanceled(data: any, env: PaddleEnv) {
  const { id, customData } = data;
  await getSupabase()
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('paddle_subscription_id', id)
    .eq('environment', env);

  // Same environment gate as upsertSubscription: a sandbox cancel must not
  // downgrade a real (live) subscriber's gating tier.
  if (env !== 'live' && Deno.env.get('PADDLE_ALLOW_SANDBOX_ENTITLEMENTS') !== 'true') {
    return;
  }

  const userId = customData?.userId;
  if (userId) {
    await getSupabase()
      .from('user_subscriptions')
      .update({ tier: 'free', status: 'canceled', updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const url = new URL(req.url);
  // Default to LIVE: if the production Paddle dashboard omits ?env=live the
  // worst case is a sandbox test event failing verification — not live
  // customer payments being silently verified against the sandbox secret
  // and never provisioned. Sandbox endpoints must opt in with ?env=sandbox.
  const envParam = url.searchParams.get('env');
  if (envParam && envParam !== 'live' && envParam !== 'sandbox') {
    return new Response('Unknown env', { status: 400 });
  }
  const env = (envParam || 'live') as PaddleEnv;

  try {
    const event = await verifyWebhook(req, env);

    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
        await upsertSubscription(event.data, env);
        break;
      case EventName.SubscriptionCanceled:
        await handleCanceled(event.data, env);
        break;
      default:
        console.log('Unhandled Paddle event:', event.eventType);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('payments-webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});
