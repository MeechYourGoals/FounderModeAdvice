ALTER TABLE public.user_notification_prefs
  ADD COLUMN IF NOT EXISTS collaboration_replies boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_notification_prefs.collaboration_replies IS
  'Whether to send a push when a teammate replies on shared analyses; enabled only by explicit user opt-in.';

-- Reuse the existing weekly job's Vault-backed HTTP command so the cron secret
-- never appears in this migration. Daily notifications are sent only to users
-- who explicitly enabled the daily prompt preference.
DO $$
DECLARE
  daily_command text;
  existing_job_id bigint;
BEGIN
  SELECT replace(command, '/generate-recommendations', '/send-daily-prompt')
    INTO daily_command
    FROM cron.job
   WHERE jobname = 'generate-weekly-recommendations'
     AND position('/generate-recommendations' in command) > 0
     AND position('cron_secret' in lower(command)) > 0
   LIMIT 1;

  IF daily_command IS NULL THEN
    RAISE NOTICE 'Daily prompt cron was not scheduled because the Vault-backed weekly job is unavailable.';
    RETURN;
  END IF;

  SELECT jobid INTO existing_job_id
    FROM cron.job
   WHERE jobname = 'send-daily-prompt'
   LIMIT 1;
  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  -- 16:00 UTC is 9:00 a.m. Pacific during daylight-saving time and 8:00 a.m.
  -- during standard time.
  PERFORM cron.schedule('send-daily-prompt', '0 16 * * *', daily_command);
END
$$;
