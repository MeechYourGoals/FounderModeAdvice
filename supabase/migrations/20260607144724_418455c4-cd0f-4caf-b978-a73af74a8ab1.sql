
-- 1) chavel_callouts: restrict public read to authenticated users who analyzed the episode
DROP POLICY IF EXISTS "Public read access for chavel_callouts" ON public.chavel_callouts;
CREATE POLICY "Users read callouts for episodes they analyzed"
ON public.chavel_callouts
FOR SELECT
TO authenticated
USING (
  episode_id IS NULL OR EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.id = chavel_callouts.episode_id
      AND e.analyzed_by = auth.uid()
  )
);

-- 2) user_monthly_usage: remove direct client write policies (writes go through SECURITY DEFINER RPC / service_role)
DROP POLICY IF EXISTS "Users can insert their own usage" ON public.user_monthly_usage;
DROP POLICY IF EXISTS "Users can update their own usage" ON public.user_monthly_usage;

-- 3,4) user_subscriptions: remove direct client write policies; subscription rows must be written server-side
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;
