-- Community Library v1 — crowdsourced general insights.
--
-- Model: every public-URL analysis (never an uploaded document) contributes
-- its *generic* lessons (never the company-tailored memo) to a shared,
-- de-identified catalog, unless the analyzing user opted out. This widens
-- `discovery_content` (already the Inspiration Library's catalog) with a
-- "community" source alongside "curated", and adds `community_lessons` for
-- the actual crowdsourced lesson text.
--
-- Privacy: no contributor identity is ever stored on a community row. Text
-- is written only after the existing genericLessons scrubber
-- (supabase/functions/_shared/genericLessons.ts) has removed the viewer's
-- company name, and analyze-episode drops any lesson that still fails that
-- check rather than publish it (see supabase/functions/_shared/community.ts).

-- ---------------------------------------------------------------------------
-- 1. Widen discovery_content with community counters.
-- ---------------------------------------------------------------------------

ALTER TABLE public.discovery_content
  ADD COLUMN IF NOT EXISTS community_analysis_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_community_analysis_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_discovery_content_community
  ON public.discovery_content (community_analysis_count DESC, last_community_analysis_at DESC)
  WHERE community_analysis_count > 0;

-- A community row (analyzed by users, not yet curated by an editor and not
-- necessarily inside the daily-brief freshness window) is servable too.
DROP POLICY IF EXISTS "Authenticated users can browse servable discovery content" ON public.discovery_content;
CREATE POLICY "Authenticated users can browse servable discovery content"
ON public.discovery_content
FOR SELECT
TO authenticated
USING (
  active
  AND (public.is_discovery_content_servable(is_curated, published_at) OR community_analysis_count > 0)
);

-- ---------------------------------------------------------------------------
-- 2. community_lessons — the crowdsourced lesson text.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.discovery_content(id) ON DELETE CASCADE,
  lesson_text text NOT NULL,
  category text,
  founder_attribution text,
  impact_score integer CHECK (impact_score IS NULL OR (impact_score BETWEEN 1 AND 10)),
  actionability_score integer CHECK (actionability_score IS NULL OR (actionability_score BETWEEN 1 AND 10)),
  -- sha256 of the normalized lesson text, computed server-side — the dedupe key.
  text_hash text NOT NULL,
  times_seen integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  -- Plain (not GENERATED) column: to_tsvector(regconfig, text) is STABLE, not
  -- IMMUTABLE, so Postgres rejects it in a GENERATED ALWAYS AS expression.
  -- Kept in sync by the trigger below instead.
  search tsvector,
  UNIQUE (content_id, text_hash)
);

CREATE INDEX IF NOT EXISTS idx_community_lessons_content
  ON public.community_lessons (content_id);
CREATE INDEX IF NOT EXISTS idx_community_lessons_search
  ON public.community_lessons USING gin (search);

CREATE OR REPLACE FUNCTION public.community_lessons_set_search()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search := to_tsvector('english', coalesce(NEW.lesson_text, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_lessons_set_search ON public.community_lessons;
CREATE TRIGGER trg_community_lessons_set_search
  BEFORE INSERT OR UPDATE OF lesson_text ON public.community_lessons
  FOR EACH ROW EXECUTE FUNCTION public.community_lessons_set_search();

ALTER TABLE public.community_lessons ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.community_content_visible(_content_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.discovery_content dc
    WHERE dc.id = _content_id AND dc.active AND dc.community_analysis_count > 0
  );
$$;

GRANT EXECUTE ON FUNCTION public.community_content_visible(uuid) TO authenticated;

-- Writes happen only through community_register_analysis (service role); no
-- authenticated INSERT/UPDATE/DELETE policy exists on purpose.
DROP POLICY IF EXISTS "Authenticated read visible community lessons" ON public.community_lessons;
CREATE POLICY "Authenticated read visible community lessons"
ON public.community_lessons FOR SELECT TO authenticated
USING (public.community_content_visible(content_id));

-- Now that community_lessons exists, attach the FK deferred in the
-- shared_insights migration (Postgres has no ADD CONSTRAINT IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shared_insights_community_lesson_fkey'
  ) THEN
    ALTER TABLE public.shared_insights
      ADD CONSTRAINT shared_insights_community_lesson_fkey
      FOREIGN KEY (community_lesson_id) REFERENCES public.community_lessons(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. user_privacy_prefs — the contribution opt-out, on by default.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_privacy_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  contribute_to_community boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_privacy_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own privacy prefs" ON public.user_privacy_prefs;
CREATE POLICY "Users select own privacy prefs"
ON public.user_privacy_prefs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users upsert own privacy prefs" ON public.user_privacy_prefs;
CREATE POLICY "Users insert own privacy prefs"
ON public.user_privacy_prefs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own privacy prefs" ON public.user_privacy_prefs;
CREATE POLICY "Users update own privacy prefs"
ON public.user_privacy_prefs FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_privacy_prefs_updated_at
  BEFORE UPDATE ON public.user_privacy_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. community_register_analysis — the only way community rows are written.
-- Called from analyze-episode with the service role client; never exposed to
-- authenticated/anon so client code cannot forge contributions.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.community_register_analysis(_content jsonb, _lessons jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content_id uuid;
  v_lesson jsonb;
BEGIN
  INSERT INTO public.discovery_content (
    url, canonical_url, content_key, title, description, image_url, publisher, author,
    published_at, content_type, duration_seconds, language, categories, topics,
    source, is_curated, active, community_analysis_count, last_community_analysis_at
  )
  VALUES (
    _content->>'url',
    _content->>'canonical_url',
    _content->>'content_key',
    _content->>'title',
    _content->>'description',
    _content->>'image_url',
    _content->>'publisher',
    _content->>'author',
    NULLIF(_content->>'published_at', '')::timestamptz,
    coalesce(_content->>'content_type', 'article'),
    NULLIF(_content->>'duration_seconds', '')::integer,
    _content->>'language',
    coalesce((SELECT array_agg(value::text) FROM jsonb_array_elements_text(coalesce(_content->'categories', '[]'::jsonb))), '{}'),
    coalesce((SELECT array_agg(value::text) FROM jsonb_array_elements_text(coalesce(_content->'topics', '[]'::jsonb))), '{}'),
    'community',
    false,
    true,
    1,
    now()
  )
  ON CONFLICT (content_key) DO UPDATE SET
    -- Never touch editor-owned columns (title, image, priority, is_curated, ...)
    -- on an existing (possibly curated) row — only the community counters move.
    community_analysis_count = discovery_content.community_analysis_count + 1,
    last_community_analysis_at = now(),
    updated_at = now()
  RETURNING id INTO v_content_id;

  FOR v_lesson IN SELECT * FROM jsonb_array_elements(coalesce(_lessons, '[]'::jsonb))
  LOOP
    INSERT INTO public.community_lessons (
      content_id, lesson_text, category, founder_attribution,
      impact_score, actionability_score, text_hash
    )
    VALUES (
      v_content_id,
      v_lesson->>'lesson_text',
      v_lesson->>'category',
      v_lesson->>'founder_attribution',
      NULLIF(v_lesson->>'impact_score', '')::integer,
      NULLIF(v_lesson->>'actionability_score', '')::integer,
      v_lesson->>'text_hash'
    )
    ON CONFLICT (content_id, text_hash) DO UPDATE SET
      times_seen = community_lessons.times_seen + 1,
      last_seen_at = now();
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.community_register_analysis(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_register_analysis(jsonb, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. search_community — the Community Library's search/browse query.
-- SECURITY INVOKER: RLS on discovery_content/community_lessons applies as
-- the calling (authenticated) user, same as every other Discover read.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_community(
  _query text DEFAULT '',
  _limit integer DEFAULT 24,
  _offset integer DEFAULT 0
)
RETURNS SETOF public.discovery_content
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT dc.*
  FROM public.discovery_content dc
  WHERE dc.active
    AND dc.community_analysis_count > 0
    AND (
      _query IS NULL OR btrim(_query) = ''
      OR to_tsvector('english',
           coalesce(dc.title, '') || ' ' || coalesce(dc.author, '') || ' ' ||
           coalesce(dc.publisher, '') || ' ' || array_to_string(dc.topics, ' ') || ' ' ||
           array_to_string(dc.categories, ' ')
         ) @@ websearch_to_tsquery('english', _query)
      OR EXISTS (
        SELECT 1 FROM public.community_lessons cl
        WHERE cl.content_id = dc.id AND cl.search @@ websearch_to_tsquery('english', _query)
      )
    )
  ORDER BY
    CASE
      WHEN _query IS NULL OR btrim(_query) = '' THEN 0
      ELSE ts_rank(
        to_tsvector('english',
          coalesce(dc.title, '') || ' ' || coalesce(dc.author, '') || ' ' ||
          coalesce(dc.publisher, '') || ' ' || array_to_string(dc.topics, ' ') || ' ' ||
          array_to_string(dc.categories, ' ')
        ),
        websearch_to_tsquery('english', _query)
      )
    END DESC,
    dc.community_analysis_count DESC,
    dc.last_community_analysis_at DESC NULLS LAST
  LIMIT greatest(_limit, 0)
  OFFSET greatest(_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.search_community(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_community(text, integer, integer) TO authenticated;
