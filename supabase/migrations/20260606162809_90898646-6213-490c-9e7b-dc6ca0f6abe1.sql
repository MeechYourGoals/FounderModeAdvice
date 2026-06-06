
-- =====================================================
-- Security hardening: lock down public write policies,
-- add ownership checks to SECURITY DEFINER functions,
-- revoke EXECUTE from anon on sensitive helpers.
-- =====================================================

-- ---- podcasts ----
DROP POLICY IF EXISTS "Public insert for podcasts" ON public.podcasts;
CREATE POLICY "Service role writes podcasts"
  ON public.podcasts FOR INSERT TO service_role WITH CHECK (true);

-- ---- companies ----
DROP POLICY IF EXISTS "Public insert for companies" ON public.companies;
CREATE POLICY "Service role writes companies"
  ON public.companies FOR INSERT TO service_role WITH CHECK (true);

-- ---- episodes ----
DROP POLICY IF EXISTS "Public insert for episodes" ON public.episodes;
DROP POLICY IF EXISTS "Public update for episodes" ON public.episodes;
DROP POLICY IF EXISTS "Public delete for episodes" ON public.episodes;
CREATE POLICY "Service role inserts episodes"
  ON public.episodes FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role updates episodes"
  ON public.episodes FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete episodes they analyzed"
  ON public.episodes FOR DELETE TO authenticated
  USING (analyzed_by = auth.uid());
CREATE POLICY "Service role deletes episodes"
  ON public.episodes FOR DELETE TO service_role USING (true);

-- ---- lessons ----
DROP POLICY IF EXISTS "Public insert for lessons" ON public.lessons;
DROP POLICY IF EXISTS "Public delete for lessons" ON public.lessons;
CREATE POLICY "Service role writes lessons"
  ON public.lessons FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role deletes lessons"
  ON public.lessons FOR DELETE TO service_role USING (true);

-- ---- chavel_callouts ----
DROP POLICY IF EXISTS "Public insert for chavel_callouts" ON public.chavel_callouts;
DROP POLICY IF EXISTS "Public delete for chavel_callouts" ON public.chavel_callouts;
CREATE POLICY "Service role writes chavel_callouts"
  ON public.chavel_callouts FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role deletes chavel_callouts"
  ON public.chavel_callouts FOR DELETE TO service_role USING (true);

-- ---- lesson_tags ----
DROP POLICY IF EXISTS "Public insert for lesson_tags" ON public.lesson_tags;
DROP POLICY IF EXISTS "Public delete for lesson_tags" ON public.lesson_tags;
CREATE POLICY "Service role writes lesson_tags"
  ON public.lesson_tags FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role deletes lesson_tags"
  ON public.lesson_tags FOR DELETE TO service_role USING (true);

-- ---- tags ----
DROP POLICY IF EXISTS "Public insert for tags" ON public.tags;
CREATE POLICY "Service role writes tags"
  ON public.tags FOR INSERT TO service_role WITH CHECK (true);

-- ---- personalized_insights ----
DROP POLICY IF EXISTS "Public insert for personalized_insights" ON public.personalized_insights;
DROP POLICY IF EXISTS "Public delete for personalized_insights" ON public.personalized_insights;
DROP POLICY IF EXISTS "Public read access for personalized_insights" ON public.personalized_insights;
CREATE POLICY "Service role writes personalized_insights"
  ON public.personalized_insights FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role deletes personalized_insights"
  ON public.personalized_insights FOR DELETE TO service_role USING (true);
CREATE POLICY "Users read insights for their analyzed episodes"
  ON public.personalized_insights FOR SELECT TO authenticated
  USING (
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.episodes e ON e.id = l.episode_id
      WHERE e.analyzed_by = auth.uid()
    )
  );

-- =====================================================
-- SECURITY DEFINER function hardening
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_or_create_subscription(p_user_id UUID)
RETURNS TABLE (tier TEXT, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  INSERT INTO public.user_subscriptions (user_id, tier, status)
  VALUES (p_user_id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN QUERY
  SELECT us.tier, us.status FROM public.user_subscriptions us WHERE us.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_monthly_usage(p_user_id UUID)
RETURNS TABLE (analyses_count INTEGER, month_year TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  INSERT INTO public.user_monthly_usage (user_id, month_year, analyses_count)
  VALUES (p_user_id, v_month, 0)
  ON CONFLICT (user_id, month_year) DO NOTHING;
  RETURN QUERY
  SELECT u.analyses_count, u.month_year
  FROM public.user_monthly_usage u
  WHERE u.user_id = p_user_id AND u.month_year = v_month;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_analysis_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  INSERT INTO public.user_monthly_usage (user_id, month_year, analyses_count)
  VALUES (p_user_id, v_month, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET analyses_count = public.user_monthly_usage.analyses_count + 1
  RETURNING analyses_count INTO v_count;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_tier_limits(p_user_id UUID)
RETURNS TABLE (tier TEXT, analyses_count INTEGER, max_analyses INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_tier TEXT;
  v_max INTEGER;
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT us.tier INTO v_tier FROM public.user_subscriptions us WHERE us.user_id = p_user_id;
  v_tier := COALESCE(v_tier, 'free');
  v_max := CASE v_tier WHEN 'free' THEN 4 WHEN 'seed' THEN 10 WHEN 'series_z' THEN 25 ELSE 4 END;
  SELECT u.analyses_count INTO v_count
  FROM public.user_monthly_usage u
  WHERE u.user_id = p_user_id AND u.month_year = v_month;
  RETURN QUERY SELECT v_tier, COALESCE(v_count, 0), v_max;
END;
$$;

-- Revoke EXECUTE from anon on SECURITY DEFINER helpers exposed via Data API
REVOKE EXECUTE ON FUNCTION public.get_or_create_subscription(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_or_create_monthly_usage(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_analysis_count(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.check_tier_limits(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_or_create_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_monthly_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_analysis_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_tier_limits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
