import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { gatewayFetch } from '../_shared/paddle.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonError = (message: string, status: number) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ---- Require valid JWT ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonError('Authentication required', 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonError('Unauthorized', 401);

    // Web purchases run through Paddle, so check for a Paddle subscription
    // first and send those users to Paddle's customer portal. The Stripe
    // portal below remains for legacy Stripe-billed customers.
    const { data: paddleSub } = await supabase
      .from('subscriptions')
      .select('paddle_customer_id, paddle_subscription_id, status')
      .eq('user_id', user.id)
      .eq('environment', 'live')
      .in('status', ['active', 'trialing', 'past_due'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paddleSub?.paddle_customer_id) {
      const portalRes = await gatewayFetch(
        'live',
        `/customers/${paddleSub.paddle_customer_id}/portal-sessions`,
        {
          method: 'POST',
          body: JSON.stringify({
            subscription_ids: paddleSub.paddle_subscription_id
              ? [paddleSub.paddle_subscription_id]
              : [],
          }),
        },
      );
      const portal = await portalRes.json();
      const url = portal?.data?.urls?.general?.overview;
      if (!portalRes.ok || !url) {
        console.error('Paddle portal session error:', portalRes.status, portal?.error ?? portal);
        return jsonError('Could not open billing portal. Please try again.', 502);
      }
      return new Response(JSON.stringify({ url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeApiKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeApiKey) {
      console.error('create-portal-session: STRIPE_SECRET_KEY missing');
      return jsonError('Service temporarily unavailable', 503);
    }

    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !subscription?.stripe_customer_id) {
      return jsonError('No subscription found for this account', 404);
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://foundermodeadvice.com';

    const portalResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: subscription.stripe_customer_id,
        return_url: `${appUrl}/`,
      }),
    });

    const portal = await portalResponse.json();
    if (portal.error) {
      console.error('Stripe portal session error:', portal.error);
      return jsonError('Could not open billing portal. Please try again.', 502);
    }

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Portal session error:', error);
    return jsonError('Could not open billing portal. Please try again.', 500);
  }
});
