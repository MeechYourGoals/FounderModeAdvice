import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

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

  // Mirror into existing user_subscriptions tier so feature gating works.
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
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;

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
