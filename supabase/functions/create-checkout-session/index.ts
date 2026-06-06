import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    const { priceId } = await req.json().catch(() => ({}));
    if (!priceId || typeof priceId !== 'string' || priceId.length > 200) {
      return jsonError('priceId is required', 400);
    }

    const stripeApiKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeApiKey) {
      console.error('create-checkout-session: STRIPE_SECRET_KEY missing');
      return jsonError('Service temporarily unavailable', 503);
    }

    const userId = user.id;

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeApiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email || '',
          'metadata[user_id]': userId,
        }),
      });

      const customer = await customerResponse.json();
      if (customer.error) {
        console.error('Stripe customer create error:', customer.error);
        return jsonError('Could not start checkout. Please try again.', 502);
      }
      customerId = customer.id;

      await supabase
        .from('user_subscriptions')
        .upsert({ user_id: userId, stripe_customer_id: customerId, tier: 'free' }, { onConflict: 'user_id' });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://podvisor.app';
    const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        mode: 'subscription',
        success_url: `${appUrl}/?subscription=success`,
        cancel_url: `${appUrl}/?subscription=cancelled`,
        'metadata[user_id]': userId,
        'subscription_data[metadata][user_id]': userId,
        allow_promotion_codes: 'true',
      }),
    });

    const session = await sessionResponse.json();
    if (session.error) {
      console.error('Stripe checkout session error:', session.error);
      return jsonError('Could not start checkout. Please try again.', 502);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    return jsonError('Could not start checkout. Please try again.', 500);
  }
});
