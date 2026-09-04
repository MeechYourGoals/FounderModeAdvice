import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';
import { signCheckoutRef } from '../_shared/checkoutRef.ts';

const ALLOWED_EXTERNAL_PRICE_IDS = new Set([
  'c_suite_monthly',
  'boardroom_monthly',
]);

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Bind the checkout to the caller's verified identity.
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Authentication required' }, 401);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return json({ error: 'Invalid request' }, 400);
    }

    const { priceId, environment } = body as Record<string, unknown>;
    if (environment !== 'live' && environment !== 'sandbox') {
      return json({ error: 'Invalid environment' }, 400);
    }
    const env: PaddleEnv = environment;

    if (!priceId || typeof priceId !== 'string') {
      return json({ error: 'priceId required' }, 400);
    }
    if (!ALLOWED_EXTERNAL_PRICE_IDS.has(priceId)) {
      return json({ error: 'Invalid price ID' }, 400);
    }

    // This authenticated endpoint still performs a third-party API call. Keep
    // one compromised session from turning it into an unbounded Paddle proxy.
    const { data: allowed, error: rateError } = await supabase.rpc(
      'check_and_increment_rate_limit',
      {
        _user_id: user.id,
        _key: 'get-paddle-price',
        _window: '1 minute',
        _limit: 30,
      },
    );
    if (rateError) {
      console.error('get-paddle-price rate limit error', rateError);
      return json({ error: 'Service temporarily unavailable' }, 503);
    }
    if (allowed === false) {
      return json({ error: 'Too many requests' }, 429);
    }

    const res = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(priceId)}`);
    if (!res.ok) {
      console.error('get-paddle-price gateway error', res.status);
      return json({ error: 'Could not resolve price' }, 502);
    }
    const data = await res.json();
    const paddleId = data?.data?.[0]?.id;

    if (!paddleId) {
      return json({ error: 'Price not found' }, 404);
    }

    return json({ paddleId, checkoutRef: await signCheckoutRef(user.id) }, 200);
  } catch (e) {
    console.error('get-paddle-price error', e);
    return json({ error: 'Could not resolve price' }, 500);
  }
});
