ALTER TABLE public.user_notification_prefs
  ADD COLUMN IF NOT EXISTS collaboration_replies boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_notification_prefs.collaboration_replies IS
  'Whether to send a push when a teammate replies on shared analyses; enabled only by explicit user opt-in.';
