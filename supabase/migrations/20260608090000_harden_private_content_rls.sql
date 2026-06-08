-- Production RLS hardening for analysis/library content.
-- Removes legacy demo/public policies and replaces them with owner/admin/service-role access.

-- ---------- Core reference tables ----------
DROP POLICY IF EXISTS "Public read access for podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Public insert for podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Authenticated users can read podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Service role writes podcasts" ON public.podcasts;

CREATE POLICY "Authenticated users can read podcasts"
ON public.podcasts FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role writes podcasts"
ON public.podcasts FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access for companies" ON public.companies;
DROP POLICY IF EXISTS "Public insert for companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can read companies" ON public.companies;
DROP POLICY IF EXISTS "Service role writes companies" ON public.companies;

CREATE POLICY "Authenticated users can read companies"
ON public.companies FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role writes companies"
ON public.companies FOR INSERT TO service_role
WITH CHECK (true);

-- ---------- Episodes ----------
DROP POLICY IF EXISTS "Public read access for episodes" ON public.episodes;
DROP POLICY IF EXISTS "Public insert for episodes" ON public.episodes;
DROP POLICY IF EXISTS "Public update for episodes" ON public.episodes;
DROP POLICY IF EXISTS "Public delete for episodes" ON public.episodes;
DROP POLICY IF EXISTS "Users can read episodes they analyzed" ON public.episodes;
DROP POLICY IF EXISTS "Admins can read all episodes" ON public.episodes;
DROP POLICY IF EXISTS "Users can delete episodes they analyzed" ON public.episodes;
DROP POLICY IF EXISTS "Admins can delete episodes" ON public.episodes;
DROP POLICY IF EXISTS "Service role inserts episodes" ON public.episodes;
DROP POLICY IF EXISTS "Service role updates episodes" ON public.episodes;
DROP POLICY IF EXISTS "Service role deletes episodes" ON public.episodes;

CREATE POLICY "Users can read episodes they analyzed"
ON public.episodes FOR SELECT TO authenticated
USING (analyzed_by = auth.uid());

CREATE POLICY "Admins can read all episodes"
ON public.episodes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete episodes they analyzed"
ON public.episodes FOR DELETE TO authenticated
USING (analyzed_by = auth.uid());

CREATE POLICY "Admins can delete episodes"
ON public.episodes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role inserts episodes"
ON public.episodes FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Service role updates episodes"
ON public.episodes FOR UPDATE TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role deletes episodes"
ON public.episodes FOR DELETE TO service_role
USING (true);

-- ---------- Lessons ----------
DROP POLICY IF EXISTS "Public read access for lessons" ON public.lessons;
DROP POLICY IF EXISTS "Public insert for lessons" ON public.lessons;
DROP POLICY IF EXISTS "Public delete for lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users can read lessons for episodes they analyzed" ON public.lessons;
DROP POLICY IF EXISTS "Admins can read all lessons" ON public.lessons;
DROP POLICY IF EXISTS "Service role writes lessons" ON public.lessons;
DROP POLICY IF EXISTS "Service role deletes lessons" ON public.lessons;

CREATE POLICY "Users can read lessons for episodes they analyzed"
ON public.lessons FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.id = lessons.episode_id
      AND e.analyzed_by = auth.uid()
  )
);

CREATE POLICY "Admins can read all lessons"
ON public.lessons FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role writes lessons"
ON public.lessons FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Service role deletes lessons"
ON public.lessons FOR DELETE TO service_role
USING (true);

-- ---------- Callouts ----------
DROP POLICY IF EXISTS "Public read access for chavel_callouts" ON public.chavel_callouts;
DROP POLICY IF EXISTS "Public insert for chavel_callouts" ON public.chavel_callouts;
DROP POLICY IF EXISTS "Public delete for chavel_callouts" ON public.chavel_callouts;
DROP POLICY IF EXISTS "Users read callouts for episodes they analyzed" ON public.chavel_callouts;
DROP POLICY IF EXISTS "Admins can read all callouts" ON public.chavel_callouts;
DROP POLICY IF EXISTS "Service role writes chavel_callouts" ON public.chavel_callouts;
DROP POLICY IF EXISTS "Service role deletes chavel_callouts" ON public.chavel_callouts;

CREATE POLICY "Users read callouts for episodes they analyzed"
ON public.chavel_callouts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.id = chavel_callouts.episode_id
      AND e.analyzed_by = auth.uid()
  )
);

CREATE POLICY "Admins can read all callouts"
ON public.chavel_callouts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role writes chavel_callouts"
ON public.chavel_callouts FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Service role deletes chavel_callouts"
ON public.chavel_callouts FOR DELETE TO service_role
USING (true);

-- ---------- Tags and lesson_tags ----------
DROP POLICY IF EXISTS "Public read access for tags" ON public.tags;
DROP POLICY IF EXISTS "Public insert for tags" ON public.tags;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tags;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can read tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
DROP POLICY IF EXISTS "Service role writes tags" ON public.tags;

CREATE POLICY "Authenticated users can read tags"
ON public.tags FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create tags"
ON public.tags FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Service role writes tags"
ON public.tags FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access for lesson_tags" ON public.lesson_tags;
DROP POLICY IF EXISTS "Public insert for lesson_tags" ON public.lesson_tags;
DROP POLICY IF EXISTS "Public delete for lesson_tags" ON public.lesson_tags;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.lesson_tags;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.lesson_tags;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.lesson_tags;
DROP POLICY IF EXISTS "Users can read lesson tags for episodes they analyzed" ON public.lesson_tags;
DROP POLICY IF EXISTS "Admins can read all lesson tags" ON public.lesson_tags;
DROP POLICY IF EXISTS "Users can tag lessons for episodes they analyzed" ON public.lesson_tags;
DROP POLICY IF EXISTS "Users can untag lessons for episodes they analyzed" ON public.lesson_tags;
DROP POLICY IF EXISTS "Service role writes lesson_tags" ON public.lesson_tags;
DROP POLICY IF EXISTS "Service role deletes lesson_tags" ON public.lesson_tags;

CREATE POLICY "Users can read lesson tags for episodes they analyzed"
ON public.lesson_tags FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.episodes e ON e.id = l.episode_id
    WHERE l.id = lesson_tags.lesson_id
      AND e.analyzed_by = auth.uid()
  )
);

CREATE POLICY "Admins can read all lesson tags"
ON public.lesson_tags FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can tag lessons for episodes they analyzed"
ON public.lesson_tags FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.episodes e ON e.id = l.episode_id
    WHERE l.id = lesson_tags.lesson_id
      AND e.analyzed_by = auth.uid()
  )
);

CREATE POLICY "Users can untag lessons for episodes they analyzed"
ON public.lesson_tags FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.episodes e ON e.id = l.episode_id
    WHERE l.id = lesson_tags.lesson_id
      AND e.analyzed_by = auth.uid()
  )
);

CREATE POLICY "Service role writes lesson_tags"
ON public.lesson_tags FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Service role deletes lesson_tags"
ON public.lesson_tags FOR DELETE TO service_role
USING (true);

-- ---------- Personalized insights ----------
DROP POLICY IF EXISTS "Public read access for personalized_insights" ON public.personalized_insights;
DROP POLICY IF EXISTS "Public insert for personalized_insights" ON public.personalized_insights;
DROP POLICY IF EXISTS "Public delete for personalized_insights" ON public.personalized_insights;
DROP POLICY IF EXISTS "Users read insights for their analyzed episodes" ON public.personalized_insights;
DROP POLICY IF EXISTS "Admins can read all personalized insights" ON public.personalized_insights;
DROP POLICY IF EXISTS "Service role writes personalized_insights" ON public.personalized_insights;
DROP POLICY IF EXISTS "Service role deletes personalized_insights" ON public.personalized_insights;

CREATE POLICY "Users read insights for their analyzed episodes"
ON public.personalized_insights FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.episodes e ON e.id = l.episode_id
    WHERE l.id = personalized_insights.lesson_id
      AND e.analyzed_by = auth.uid()
  )
);

CREATE POLICY "Admins can read all personalized insights"
ON public.personalized_insights FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role writes personalized_insights"
ON public.personalized_insights FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Service role deletes personalized_insights"
ON public.personalized_insights FOR DELETE TO service_role
USING (true);
