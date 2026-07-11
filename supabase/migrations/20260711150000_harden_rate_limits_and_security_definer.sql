-- Harden rate_limits: clients must not read or write counters directly.
-- Edge functions call check_and_increment_rate_limit via service_role only.

DROP POLICY IF EXISTS "Users read own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users insert own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users update own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users delete own rate limits" ON public.rate_limits;

REVOKE ALL ON TABLE public.rate_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.rate_limits TO service_role;

-- Rate limiter RPC: service_role only (video-chat, parse-deck edge functions).
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, interval, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, interval, integer)
  TO service_role;

-- Trigger helpers: not callable via PostgREST; revoke default PUBLIC execute.
REVOKE EXECUTE ON FUNCTION public.enforce_profile_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_bookmarked_episodes_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_bookmarked_lessons_limit() FROM PUBLIC, anon, authenticated;

-- Re-assert subscription / role helpers are not callable by anon (CREATE OR REPLACE
-- does not reset grants; this guards against drift or manual re-grants).
DO $$
DECLARE
  fn text;
  auth_fns text[] := ARRAY[
    'public.get_or_create_subscription(uuid)',
    'public.get_or_create_monthly_usage(uuid)',
    'public.increment_analysis_count(uuid)',
    'public.check_tier_limits(uuid)',
    'public.has_role(uuid, app_role)',
    'public.get_tier_max(uuid, text)',
    'public.is_folder_owner(uuid, uuid)',
    'public.is_folder_member(uuid, uuid)',
    'public.user_can_view_episode(uuid, uuid)',
    'public.user_can_view_lesson(uuid, uuid)',
    'public.user_has_paid_plan(uuid)',
    'public.user_has_boardroom_plan(uuid)',
    'public.is_episode_owner(uuid, uuid)',
    'public.can_user_view_invited_episode(uuid, uuid)',
    'public.user_can_access_episode(uuid, uuid)',
    'public.insight_belongs_to_episode(text, uuid, uuid)',
    'public.accept_folder_invite(text)',
    'public.accept_analysis_invite(text)',
    'public.list_episode_collaborators(uuid)'
  ];
  service_only_fns text[] := ARRAY[
    'public.check_and_increment_rate_limit(uuid, text, interval, integer)'
  ];
BEGIN
  FOREACH fn IN ARRAY auth_fns LOOP
  BEGIN
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  EXCEPTION
    WHEN undefined_function THEN NULL;
  END;
  END LOOP;

  FOREACH fn IN ARRAY service_only_fns LOOP
  BEGIN
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  EXCEPTION
    WHEN undefined_function THEN NULL;
  END;
  END LOOP;
END $$;
