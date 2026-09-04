-- Public, unauthenticated "Share an insight" cards.
--
-- A shared insight is a standalone, publicly readable snapshot of one
-- generic lesson (never a personalized/tailored insight, never content from
-- an uploaded private document): the quote text, attribution, and source.
-- It powers the /i/:slug landing page and the share-card edge function's
-- Open Graph unfurl, and is intentionally decoupled from the owner-scoped
-- `lessons` / `community_lessons` RLS so a logged-out visitor and link
-- scrapers (Slack, iMessage, WhatsApp, X, LinkedIn) can read it.
--
-- No table-level anon SELECT policy is granted. Public reads go through the
-- SECURITY DEFINER function below, which returns only the safe columns.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Slug generator: 10-char base62, collision-checked.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_share_slug()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..10 LOOP
      candidate := candidate || substr(alphabet, (get_byte(gen_random_bytes(1), 0) % 62) + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.shared_insights WHERE slug = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shared_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE DEFAULT public.generate_share_slug(),
  -- Exactly one of these two identifies where the quote came from.
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  community_lesson_id uuid, -- FK added once community_lessons exists (see 20260903100200 migration)
  episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  quote_text text NOT NULL CHECK (char_length(quote_text) <= 600),
  attribution text,
  source_title text,
  source_url text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  view_count integer NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  CONSTRAINT shared_insights_exactly_one_source CHECK (
    (lesson_id IS NOT NULL AND community_lesson_id IS NULL)
    OR (lesson_id IS NULL AND community_lesson_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_shared_insights_created_by
  ON public.shared_insights (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_insights_lesson
  ON public.shared_insights (lesson_id) WHERE lesson_id IS NOT NULL;

ALTER TABLE public.shared_insights ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- A lesson can be shared only by the episode's owner, and only when the
-- episode came from a public URL (never an uploaded private document).
CREATE OR REPLACE FUNCTION public.lesson_is_shareable(_lesson_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.episodes e ON e.id = l.episode_id
    WHERE l.id = _lesson_id
      AND e.analyzed_by = _user_id
      AND e.source_type = 'url'
  );
$$;

GRANT EXECUTE ON FUNCTION public.lesson_is_shareable(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Owner-scoped RLS (create/revoke your own shares).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Owners select own shared insights" ON public.shared_insights;
CREATE POLICY "Owners select own shared insights"
ON public.shared_insights FOR SELECT TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Owners insert own shared insights" ON public.shared_insights;
CREATE POLICY "Owners insert own shared insights"
ON public.shared_insights FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    (lesson_id IS NOT NULL AND public.lesson_is_shareable(lesson_id, auth.uid()))
    OR (community_lesson_id IS NOT NULL AND lesson_id IS NULL)
  )
);

DROP POLICY IF EXISTS "Owners revoke own shared insights" ON public.shared_insights;
CREATE POLICY "Owners revoke own shared insights"
ON public.shared_insights FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Public read + view counter, via SECURITY DEFINER functions only — never a
-- table-level anon policy, so created_by and other columns stay private.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_shared_insight(_slug text)
RETURNS TABLE (
  slug text,
  quote_text text,
  attribution text,
  source_title text,
  source_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT si.slug, si.quote_text, si.attribution, si.source_title, si.source_url, si.created_at
  FROM public.shared_insights si
  WHERE si.slug = _slug
    AND si.revoked_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.get_shared_insight(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_insight(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_shared_insight_view(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.shared_insights
  SET view_count = view_count + 1
  WHERE slug = _slug AND revoked_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.record_shared_insight_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_shared_insight_view(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public storage bucket for generated share-card PNGs. Written only by the
-- share-card edge function (service role); readable by anyone (the image is
-- already public via the og:image tag).
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public) VALUES ('share-cards', 'share-cards', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view share card images" ON storage.objects;
CREATE POLICY "Anyone can view share card images"
ON storage.objects FOR SELECT
USING (bucket_id = 'share-cards');

DROP POLICY IF EXISTS "Service role writes share card images" ON storage.objects;
CREATE POLICY "Service role writes share card images"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'share-cards')
WITH CHECK (bucket_id = 'share-cards');
