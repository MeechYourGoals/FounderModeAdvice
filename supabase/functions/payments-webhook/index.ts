import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

type OwnershipResult = 'ok' | 'mismatch' | 'error';

// Guard against customData.userId spoofing: verify the Paddle customer belongs
// to the claimed user. Without this, anyone can open Paddle checkout from
// devtools with a victim's UUID and grant/strip a paid plan on their account.
//
// Ownership is accepted when EITHER:
//  a) a previously verified row already links this Paddle customer (or this
//     Paddle subscription) to the same user — covers app-side email changes and
//     checkouts completed with a different email than the account, or
//  b) the Paddle customer email matches one of the auth user's emails.
// Transient gateway/API failures return 'error' so the event is retried by
// Paddle instead of being silently dropped.
async function verifyUserOwnsCustomer(
  userId: string,
  customerId: string,
  subscriptionId: string,
  env: PaddleEnv,
): Promise<OwnershipResult> {
  // (a) Trust an existing verified link for this customer/subscription.
  const { data: linked, error: linkErr } = await getSupabase()
    .from('subscriptions')
    .select('user_id')
    .eq('environment', env)
    .or(
      `paddle_customer_id.eq.${customerId},paddle_subscription_id.eq.${subscriptionId}`,
    )
    .limit(5);
  if (linkErr) {
    console.error('Ownership link lookup failed', linkErr);
    return 'error';
  }
  const rows = (linked ?? []) as { user_id: string }[];
  if (rows.length > 0) {
    return rows.some((r) => r.user_id === userId) ? 'ok' : 'mismatch';
  }

  // (b) First-time link: match the Paddle customer email against the auth user.
  const { data: authUser, error } = await getSupabase().auth.admin.getUserById(userId);
  if (error) {
    console.error('getUserById failed', error);
    return 'error';
  }
  const emails = new Set(
    [
      authUser?.user?.email,
      ...((authUser?.user?.identities ?? []) as { identity_data?: { email?: string } }[]).map(
        (i) => i.identity_data?.email,
      ),
    ]
      .filter(Boolean)
      .map((e) => String(e).toLowerCase().trim()),
  );
  if (emails.size === 0) return 'mismatch';

  let res: Response;
  try {
    res = await gatewayFetch(env, `/customers/${encodeURIComponent(customerId)}`);
  } catch (e) {
    console.error('Paddle customer fetch threw', e);
    return 'error';
  }
  if (res.status === 404) return 'mismatch';
  if (!res.ok) {
    console.error('Paddle customer fetch failed', res.status);
    return 'error';
  }
  const body = await res.json().catch(() => null);
  const customerEmail = String(body?.data?.email ?? '').toLowerCase().trim();
  if (!customerEmail) return 'error';
  return emails.has(customerEmail) ? 'ok' : 'mismatch';
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
  let userId: string | undefined = customData?.userId;
  if (!userId) {
    // Renewals/updates can arrive without customData. Fall back to the owner
    // already recorded for this Paddle subscription instead of dropping it.
    const { data: existing } = await getSupabase()
      .from('subscriptions')
      .select('user_id')
      .eq('paddle_subscription_id', id)
      .eq('environment', env)
      .maybeSingle();
    userId = (existing as { user_id?: string } | null)?.user_id;
  }
  if (!userId) {
    console.warn(`Subscription event ${id} without customData.userId and no known owner — skipping`);
    return;
  }

  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn('Skipping subscription: missing importMeta.externalId');
    return;
  }

  // Anti-spoof: customData.userId is client-supplied. Verify the Paddle
  // customer actually belongs to the claimed user before granting.
  const owns = await verifyUserOwnsCustomer(userId, customerId, id, env);
  if (owns === 'error') {
    // Transient failure — throw so the handler returns non-2xx and Paddle retries.
    throw new Error(`Ownership verification unavailable for subscription ${id}`);
  }
  if (owns === 'mismatch') {
    console.warn(`Rejecting subscription ${id}: customer ${customerId} does not match claimed userId ${userId}`);
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
  // Permanent founder accounts stay on Boardroom regardless of billing state.
  const founder = await isFounderUserId(getSupabase(), userId);
  await getSupabase().from('user_subscriptions').upsert(
    {
      user_id: userId,
      tier: founder ? 'series_z' : isActive ? tier : 'free',
      status: founder ? 'active' : isActive ? 'active' : status,
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

  // Only downgrade the user_subscriptions row that actually owns this
  // paddle_subscription_id — never trust customData.userId on cancel, since
  // a spoofed cancel could otherwise strip a victim's plan.
  const { data: subRow } = await getSupabase()
    .from('subscriptions')
    .select('user_id')
    .eq('paddle_subscription_id', id)
    .eq('environment', env)
    .maybeSingle();
  const ownerUserId = (subRow as { user_id?: string } | null)?.user_id;
  if (ownerUserId) {
    await getSupabase()
      .from('user_subscriptions')
      .update({ tier: 'free', status: 'canceled', updated_at: new Date().toISOString() })
      .eq('user_id', ownerUserId);
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
