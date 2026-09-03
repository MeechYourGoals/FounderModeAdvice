-- Dedicated opt-in for the weekly Founder Briefing push, split out from the
-- daily prompt toggle so a user can get one without the other.
--
-- Backfill: anyone already opted into the daily prompt keeps receiving the
-- weekly briefing push too (today's actual behavior, since
-- generate-recommendations currently reuses daily_prompt) — this migration
-- only splits the column, it does not change who gets pushed until the
-- edge function switches over in the same deploy.
ALTER TABLE public.user_notification_prefs
  ADD COLUMN IF NOT EXISTS weekly_briefing boolean NOT NULL DEFAULT false;

UPDATE public.user_notification_prefs
  SET weekly_briefing = true
  WHERE daily_prompt = true;

COMMENT ON COLUMN public.user_notification_prefs.weekly_briefing IS
  'Whether to send one push per ready weekly Discover batch (generate-recommendations). Independent of daily_prompt.';
