-- Onboarding intake now asks "Which founders, operators, and thought leaders
-- inspire you?" — store the picked names on the user's onboarding row so the
-- answer syncs across devices. A jsonb string array (e.g. '["Steve Jobs"]')
-- keeps the shape flexible; the client also caches it in localStorage and
-- tolerates this column being absent, so the migration can ship independently.
ALTER TABLE public.user_onboarding
  ADD COLUMN IF NOT EXISTS inspirations jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Existing RLS on user_onboarding (owner-only select/insert/update) already
-- covers the new column; no policy changes needed.
