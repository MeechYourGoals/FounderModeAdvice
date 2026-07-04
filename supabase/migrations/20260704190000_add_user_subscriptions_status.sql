-- user_subscriptions is written with a `status` column by payments-webhook
-- (Paddle), sync-revenuecat-subscription, and get_or_create_subscription(),
-- but no migration ever added the column — on a database built strictly from
-- this migration history every one of those writes fails, which means paid
-- users are never upgraded. Idempotent so it is a no-op where the column was
-- already added out-of-band.
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Rollback:
-- ALTER TABLE public.user_subscriptions DROP COLUMN IF EXISTS status;
