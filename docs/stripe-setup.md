# Stripe setup

This repo supports web subscriptions through Stripe Checkout and Stripe Billing Portal via Supabase Edge Functions.

## Client environment

Set the browser-safe publishable key in the Vite environment:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
VITE_STRIPE_SEED_PRICE_ID=price_xxxx
VITE_STRIPE_SERIES_Z_PRICE_ID=price_xxxx
VITE_APP_URL=https://your-app-url.com
```

Only `VITE_STRIPE_PUBLISHABLE_KEY` is safe to expose to the browser. Never add `STRIPE_SECRET_KEY` to a `VITE_*` variable.

## Supabase Edge Function secrets

The server-side Stripe secret key and webhook signing secret must be configured in Supabase, not committed to the repo:

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_xxxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxxx \
  STRIPE_SEED_PRICE_ID=price_xxxx \
  STRIPE_SERIES_Z_PRICE_ID=price_xxxx \
  APP_URL=https://your-app-url.com
```

Deploy these functions after secrets are set:

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

## Stripe webhook endpoint

Create a Stripe webhook endpoint pointed at:

```text
https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```

Subscribe it to at least these events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Copy the webhook signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` in Supabase.
