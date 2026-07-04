ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';