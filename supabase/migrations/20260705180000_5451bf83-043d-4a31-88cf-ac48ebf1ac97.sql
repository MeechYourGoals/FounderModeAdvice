
-- 1. rate_limits: add RLS policies restricting to owner (writes still go via SECURITY DEFINER function running as postgres/service_role).
CREATE POLICY "Users read own rate limits" ON public.rate_limits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own rate limits" ON public.rate_limits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rate limits" ON public.rate_limits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own rate limits" ON public.rate_limits FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. episode_transcripts: allow collaborators (invite grants + folder members) to read.
CREATE POLICY "Invited users can read episode transcripts"
  ON public.episode_transcripts FOR SELECT TO authenticated
  USING (public.can_user_view_invited_episode(episode_id, auth.uid()));

CREATE POLICY "Folder members can read episode transcripts"
  ON public.episode_transcripts FOR SELECT TO authenticated
  USING (public.user_can_view_episode(episode_id, auth.uid()));

-- 3. Revoke EXECUTE on rate limiter from anon/PUBLIC (called only by edge functions using service_role).
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, interval, integer) FROM PUBLIC, anon;
