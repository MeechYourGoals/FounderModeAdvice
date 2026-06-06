CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_onboarding TO authenticated;
GRANT ALL ON public.user_onboarding TO service_role;

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_onboarding' AND policyname='Users can view their own onboarding state') THEN
    CREATE POLICY "Users can view their own onboarding state"
      ON public.user_onboarding FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_onboarding' AND policyname='Users can insert their own onboarding state') THEN
    CREATE POLICY "Users can insert their own onboarding state"
      ON public.user_onboarding FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_onboarding' AND policyname='Users can update their own onboarding state') THEN
    CREATE POLICY "Users can update their own onboarding state"
      ON public.user_onboarding FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_user_onboarding_updated_at ON public.user_onboarding;
CREATE TRIGGER set_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();