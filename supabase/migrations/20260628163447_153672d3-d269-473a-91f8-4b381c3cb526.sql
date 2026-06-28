
-- Enable trigram index for fuzzy founder search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Facet columns on episodes
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS channel_name text;
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS channel_handle text;
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS topics text[] DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_episodes_channel_handle ON public.episodes (channel_handle);
CREATE INDEX IF NOT EXISTS idx_episodes_founder_names_trgm ON public.episodes USING gin (founder_names gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_episodes_topics ON public.episodes USING gin (topics);

-- 2. user_favorites table (polymorphic: founder | channel | topic)
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('founder','channel','topic')),
  value text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, value)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_favorites TO service_role;

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own favorites"
  ON public.user_favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Paid users insert own favorites"
  ON public.user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.user_has_paid_plan(auth.uid()));

CREATE POLICY "Users delete own favorites"
  ON public.user_favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_kind ON public.user_favorites (user_id, kind);
