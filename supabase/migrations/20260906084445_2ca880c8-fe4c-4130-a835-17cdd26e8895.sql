-- Preserve the opt-in default specified by 20260903100100_add_weekly_briefing_pref.sql.
ALTER TABLE public.user_notification_prefs
  ADD COLUMN IF NOT EXISTS weekly_briefing boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_notification_prefs
  ALTER COLUMN weekly_briefing SET DEFAULT false;
