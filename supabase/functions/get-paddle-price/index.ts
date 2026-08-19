import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';
import { signCheckoutRef } from '../_shared/checkoutRef.ts';

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

    const { priceId, environment } = await req.json();
    const env: PaddleEnv = environment === 'live' ? 'live' : 'sandbox';

    if (!priceId || typeof priceId !== 'string') {
      return json({ error: 'priceId required' }, 400);
    }

    const res = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(priceId)}`);
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
