-- Schedule the weekly briefing run.
--
-- The generation job was only ever a copy-paste step in docs/discovery-setup.md,
-- so whether a deployment produces briefings at all depended on someone having
-- run that SQL by hand. Worse, 20260829123000_enable_collaboration_push.sql
-- derives the daily-prompt job by cloning this one out of cron.job — if the
-- weekly job was never created, that migration silently no-ops and NEITHER job
-- exists. This puts the schedule in version control and self-heals the daily
-- prompt when it was skipped for that reason.
--
-- The cron secret never appears in this file. The command below embeds a lookup
-- expression that is evaluated at each firing, so cron.job.command holds the
-- lookup, not the secret.

DO $$
DECLARE
  v_command text;
  v_job_id bigint;
BEGIN
  -- A database without pg_cron/pg_net (local stack, CI) must notice and carry
  -- on, never fail the migration run.
  IF (SELECT count(*) FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net')) < 2 THEN
    RAISE NOTICE 'Weekly recommendations cron not scheduled: pg_cron and/or pg_net are not installed.';
    RETURN;
  END IF;

  -- Never clobber a working hand-made job. A deployment that already has one
  -- may be using a Vault wiring we cannot reconstruct here, and replacing it
  -- with the fallback below would be a downgrade.
  IF EXISTS (
    SELECT 1 FROM cron.job
     WHERE jobname = 'generate-weekly-recommendations'
       AND position('/generate-recommendations' in command) > 0
       AND position('cron_secret' in lower(command)) > 0
  ) THEN
    RAISE NOTICE 'Weekly recommendations cron already scheduled; leaving it as is.';
  ELSE
    -- Preferred: mirror the daily-prompt job in reverse. It inherits that job's
    -- URL, header shape, and secret source for free.
    SELECT replace(command, '/send-daily-prompt', '/generate-recommendations')
      INTO v_command
      FROM cron.job
     WHERE jobname = 'send-daily-prompt'
       AND position('/send-daily-prompt' in command) > 0
       AND position('cron_secret' in lower(command)) > 0
     LIMIT 1;

    -- Fallback: build it from scratch. The secret is resolved at fire time from
    -- Vault, falling back to the database-level GUC that discovery-setup.md
    -- documents (`alter database postgres set app.cron_secret = '...'`).
    IF v_command IS NULL THEN
      v_command := $cmd$
        select net.http_post(
          url     := 'https://iffcuueutmsusgdfekvm.supabase.co/functions/v1/generate-recommendations',
          headers := jsonb_build_object(
                       'Content-Type',  'application/json',
                       'x-cron-secret', coalesce(
                         (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
                         current_setting('app.cron_secret', true)
                       )
                     ),
          body    := '{}'::jsonb
        );
      $cmd$;
    END IF;

    SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'generate-weekly-recommendations' LIMIT 1;
    IF v_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_job_id);
    END IF;

    -- Hourly on Mondays (UTC), matching docs/discovery-setup.md. isoWeekKey()
    -- rolls over on Monday, so the first tick of the week is the first tick
    -- after the new key exists. The first tick claims up to
    -- DISCOVERY_MAX_PROFILES_PER_RUN profiles and later ticks drain the rest;
    -- the UNIQUE (profile_id, week_key) claim makes every repeat run a no-op
    -- with zero provider calls, so over-scheduling costs nothing.
    PERFORM cron.schedule('generate-weekly-recommendations', '7 * * * 1', v_command);
    RAISE NOTICE 'Weekly recommendations cron scheduled.';
  END IF;

  -- Self-heal the daily prompt, which depends on the weekly job existing and
  -- will have been skipped on any database where it did not. No-op otherwise.
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-daily-prompt') THEN
    SELECT replace(command, '/generate-recommendations', '/send-daily-prompt')
      INTO v_command
      FROM cron.job
     WHERE jobname = 'generate-weekly-recommendations'
     LIMIT 1;

    IF v_command IS NOT NULL THEN
      -- 16:00 UTC is 9:00 a.m. Pacific during daylight-saving time and 8:00 a.m.
      -- during standard time.
      PERFORM cron.schedule('send-daily-prompt', '0 16 * * *', v_command);
      RAISE NOTICE 'Daily prompt cron scheduled from the weekly job.';
    END IF;
  END IF;
END
$$;
