import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { isFounderUserId } from '../_shared/founders.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Stripe signature verification
async function verifyStripeSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): Promise<boolean> {
  const encoder = new TextEncoder();

  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const v1Signature = parts.find(p => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !v1Signature) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSignature === v1Signature;
}

// Map Stripe price IDs to subscription tiers
function getTierFromPriceId(priceId: string): 'seed' | 'series_z' | 'free' {
  const seedPriceId = Deno.env.get('STRIPE_SEED_PRICE_ID');
  const seriesZPriceId = Deno.env.get('STRIPE_SERIES_Z_PRICE_ID');

  if (priceId === seedPriceId) return 'seed';
  if (priceId === seriesZPriceId) return 'series_z';
  return 'free';
}

// Sync subscription to RevenueCat
async function syncToRevenueCat(
  userId: string,
  tier: 'seed' | 'series_z' | 'free',
  stripeSubscriptionId: string
): Promise<void> {
  const revenueCatApiKey = Deno.env.get('REVENUECAT_API_KEY');
  if (!revenueCatApiKey) {
    console.log('RevenueCat API key not configured, skipping sync');
    return;
  }

  const entitlement = tier === 'seed' ? 'seed_subscription' :
                      tier === 'series_z' ? 'series_z_subscription' : null;

  if (!entitlement) {
    console.log('No entitlement to grant for free tier');
    return;
  }

  try {
    // Grant entitlement via RevenueCat API
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${userId}/entitlements/${entitlement}/grant`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${revenueCatApiKey}`,
          'Content-Type': 'application/json',
          'X-Platform': 'stripe',
        },
        body: JSON.stringify({
          duration: 'monthly',
          start_time_ms: Date.now(),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('RevenueCat sync failed:', error);
    } else {
      console.log('RevenueCat entitlement granted:', entitlement);
    }
  } catch (error) {
    console.error('Error syncing to RevenueCat:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No Stripe signature found');
    }

    const payload = await req.text();

    // Verify signature
    const isValid = await verifyStripeSignature(payload, signature, webhookSecret);
    if (!isValid) {
      throw new Error('Invalid Stripe signature');
    }

    const event = JSON.parse(payload);
    console.log('Stripe webhook event:', event.type);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (!userId) {
          console.error('No user_id in session metadata');
          break;
        }

        // Get subscription details from Stripe
        const stripeApiKey = Deno.env.get('STRIPE_SECRET_KEY');
        const subResponse = await fetch(
          `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
          {
            headers: {
              'Authorization': `Bearer ${stripeApiKey}`,
            },
          }
        );

        const subscription = await subResponse.json();
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const founder = await isFounderUserId(supabase, userId);
        const tier = founder ? 'series_z' : getTierFromPriceId(priceId);

        // Update subscription in database
        const { error } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            tier,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (error) {
          console.error('Error updating subscription:', error);
        } else {
          console.log('Subscription updated for user:', userId, 'tier:', tier);

          // Sync to RevenueCat
          await syncToRevenueCat(userId, tier, subscriptionId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by customer ID
        const { data: userSub } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!userSub) {
          console.error('No user found for customer:', customerId);
          break;
        }

        const priceId = subscription.items?.data?.[0]?.price?.id;
        const tier = (await isFounderUserId(supabase, userSub.user_id))
          ? 'series_z'
          : getTierFromPriceId(priceId);

        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            tier,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error('Error updating subscription:', error);
        } else {
          console.log('Subscription updated for customer:', customerId);
          await syncToRevenueCat(userSub.user_id, tier, subscription.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Founder accounts are permanently on Boardroom — skip the downgrade.
        const { data: ownerRow } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        if (await isFounderUserId(supabase, ownerRow?.user_id)) {
          console.log('Skipping cancel downgrade for founder account');
          break;
        }

        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            tier: 'free',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error('Error canceling subscription:', error);
        } else {
          console.log('Subscription canceled for customer:', customerId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        console.log('Payment failed for customer:', customerId);
        // Could send notification email here
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
