-- Onboarding intake now opens with "What are you wrestling with right now?" —
-- a multi-select of current founder challenges (fundraising, hiring, PMF, …).
-- Store the picked challenge ids on the user's onboarding row so the answer
-- syncs across devices and can personalize the desk and briefing copy. A jsonb
-- string array (e.g. '["fundraising","hiring"]') keeps the shape flexible; the
-- client also caches it in localStorage and tolerates this column being
-- absent, so the migration can ship independently.
ALTER TABLE public.user_onboarding
  ADD COLUMN IF NOT EXISTS challenges jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Existing RLS on user_onboarding (owner-only select/insert/update) already
-- covers the new column; no policy changes needed.
