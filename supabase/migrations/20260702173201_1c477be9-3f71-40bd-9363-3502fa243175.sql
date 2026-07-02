ALTER TABLE public.user_onboarding
  ADD COLUMN IF NOT EXISTS inspirations jsonb NOT NULL DEFAULT '[]'::jsonb;