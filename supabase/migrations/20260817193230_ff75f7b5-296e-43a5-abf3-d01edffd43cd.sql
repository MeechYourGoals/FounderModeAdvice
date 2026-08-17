-- Personalized discovery: an Inspiration Library plus weekly, profile-scoped
-- recommendation batches that feed the existing analyze-episode pipeline.
--
-- Model:
--   user_startup_profiles
--        ↓ profile_recommendation_contexts (cached semantic context, 1:1)
--        ↓ recommendation_batches          (one weekly edition per profile)
--        ↓ profile_recommendations         (~10 ranked items per batch)
--        ↓ discovery_content               (shared metadata catalog)
--   recommendation_events                  (behavioral signals for future ranking)
--
-- Entitlement: personalized discovery is Boardroom-only and reuses the existing
-- public.user_has_boardroom_plan() helper — no competing gating logic. The
-- Inspiration Library is readable by any authenticated user (it doubles as the
-- lower-tier teaser and the empty state for premium users).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Server-side weekly key (ISO week, always UTC) so a user's timezone can never
-- produce two editions for the same week. Format: 2026-W34.
CREATE OR REPLACE FUNCTION public.discovery_week_key(_at timestamptz DEFAULT now())
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT to_char((_at AT TIME ZONE 'UTC'), 'IYYY-"W"IW');
$$;

CREATE OR REPLACE FUNCTION public.owns_startup_profile(_profile_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_startup_profiles p
    WHERE p.id = _profile_id
      AND p.user_id = _user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- discovery_content — shared catalog of publicly available material.
-- Metadata + link only: no copyrighted body text is stored here.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.discovery_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  canonical_url text NOT NULL,
  -- Normalized dedupe key: "youtube:<videoId>" for videos, "<host><path>" otherwise.
  content_key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  image_url text,
  publisher text,
  author text,
  published_at timestamptz,
  content_type text NOT NULL DEFAULT 'article'
    CHECK (content_type IN ('article', 'video', 'podcast', 'research', 'essay', 'other')),
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  language text,
  categories text[] NOT NULL DEFAULT '{}',
  topics text[] NOT NULL DEFAULT '{}',
  -- Where the item came from: a curated seed or a discovery provider id.
  source text NOT NULL DEFAULT 'curated',
  is_curated boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  -- 0..1 heuristic source-quality signal used by the ranking pipeline.
  quality_score numeric(4, 3) NOT NULL DEFAULT 0.500
    CHECK (quality_score >= 0 AND quality_score <= 1),
  discovered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discovery_content_curated
  ON public.discovery_content (is_curated, active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_content_categories
  ON public.discovery_content USING gin (categories);
CREATE INDEX IF NOT EXISTS idx_discovery_content_published
  ON public.discovery_content (published_at DESC NULLS LAST);

-- ---------------------------------------------------------------------------
-- profile_recommendation_contexts — cached semantic context per profile.
-- Rebuilt only when the profile materially changes (fingerprint mismatch),
-- so weekly generation does not re-derive it from raw rows every run.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_recommendation_contexts (
  profile_id uuid PRIMARY KEY
    REFERENCES public.user_startup_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context jsonb NOT NULL,
  -- Hash of the profile fields the context is derived from.
  profile_fingerprint text NOT NULL,
  last_manual_refresh_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_recommendation_contexts_user
  ON public.profile_recommendation_contexts (user_id);

-- ---------------------------------------------------------------------------
-- recommendation_batches — one weekly edition per profile.
-- UNIQUE (profile_id, week_key) is the idempotency key: running the weekly job
-- twice for the same profile/week can never create a second edition.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.recommendation_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL
    REFERENCES public.user_startup_profiles(id) ON DELETE CASCADE,
  week_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'failed', 'empty')),
  generation_source text NOT NULL DEFAULT 'scheduled'
    CHECK (generation_source IN ('scheduled', 'manual')),
  item_count integer NOT NULL DEFAULT 0,
  -- Provider/candidate diagnostics for one run (counts only, no user content).
  generation_stats jsonb,
  error_message text,
  notified_at timestamptz,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, week_key)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_batches_profile
  ON public.recommendation_batches (profile_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_batches_user
  ON public.recommendation_batches (user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_batches_pending_notify
  ON public.recommendation_batches (notified_at, status)
  WHERE notified_at IS NULL;

-- ---------------------------------------------------------------------------
-- profile_recommendations — the ranked items inside a batch.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.recommendation_batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL
    REFERENCES public.user_startup_profiles(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.discovery_content(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  score numeric(6, 3) NOT NULL DEFAULT 0,
  score_breakdown jsonb,
  -- 1-3 sentence "why this matters to you", generated from the profile context.
  reason text,
  state text NOT NULL DEFAULT 'unseen'
    CHECK (state IN ('unseen', 'viewed', 'opened', 'saved', 'analyzed', 'dismissed')),
  saved_at timestamptz,
  dismissed_at timestamptz,
  analyzed_episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_recommendations_batch
  ON public.profile_recommendations (batch_id, position);
-- Novelty suppression: "has this profile already been shown this item?"
CREATE INDEX IF NOT EXISTS idx_profile_recommendations_profile_content
  ON public.profile_recommendations (profile_id, content_id);
CREATE INDEX IF NOT EXISTS idx_profile_recommendations_saved
  ON public.profile_recommendations (user_id, state, created_at DESC);

-- ---------------------------------------------------------------------------
-- recommendation_events — behavioral signals. Kept deliberately thin so future
-- personalization has history to learn from without any V1 ML.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.recommendation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.user_startup_profiles(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES public.profile_recommendations(id) ON DELETE CASCADE,
  content_id uuid REFERENCES public.discovery_content(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN (
      'impression', 'opened', 'source_opened', 'saved', 'unsaved',
      'dismissed', 'analyze_clicked', 'analysis_completed', 'more_like_this'
    )),
  surface text NOT NULL DEFAULT 'for_you'
    CHECK (surface IN ('for_you', 'inspiration', 'saved')),
  position integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_events_user
  ON public.recommendation_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_profile_type
  ON public.recommendation_events (profile_id, event_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.discovery_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_recommendation_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;

-- discovery_content: any signed-in user may browse active items (that IS the
-- Inspiration Library). Writes are admin/service-role only.
DROP POLICY IF EXISTS "Authenticated users can browse active discovery content" ON public.discovery_content;
CREATE POLICY "Authenticated users can browse active discovery content"
ON public.discovery_content
FOR SELECT
TO authenticated
USING (active = true);

DROP POLICY IF EXISTS "Admins manage discovery content" ON public.discovery_content;
CREATE POLICY "Admins manage discovery content"
ON public.discovery_content
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Recommendation context is derived data the client never needs to write.
DROP POLICY IF EXISTS "Users read own recommendation context" ON public.profile_recommendation_contexts;
CREATE POLICY "Users read own recommendation context"
ON public.profile_recommendation_contexts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own recommendation batches" ON public.recommendation_batches;
CREATE POLICY "Users read own recommendation batches"
ON public.recommendation_batches
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND public.owns_startup_profile(profile_id, auth.uid()));

DROP POLICY IF EXISTS "Users read own recommendations" ON public.profile_recommendations;
CREATE POLICY "Users read own recommendations"
ON public.profile_recommendations
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND public.owns_startup_profile(profile_id, auth.uid()));

-- No client UPDATE policy on purpose: state changes go through
-- set_recommendation_state() so score/reason/position stay server-owned.

DROP POLICY IF EXISTS "Users read own recommendation events" ON public.recommendation_events;
CREATE POLICY "Users read own recommendation events"
ON public.recommendation_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users log own recommendation events" ON public.recommendation_events;
CREATE POLICY "Users log own recommendation events"
ON public.recommendation_events
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (profile_id IS NULL OR public.owns_startup_profile(profile_id, auth.uid()))
  AND (
    recommendation_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.profile_recommendations r
      WHERE r.id = recommendation_id AND r.user_id = auth.uid()
    )
  )
);

-- ---------------------------------------------------------------------------
-- State transitions (owner-only, server-validated)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_recommendation_state(
  p_recommendation_id uuid,
  p_state text,
  p_episode_id uuid DEFAULT NULL
)
RETURNS public.profile_recommendations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row public.profile_recommendations%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  IF p_state NOT IN ('unseen', 'viewed', 'opened', 'saved', 'analyzed', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid recommendation state: %', p_state USING errcode = '22023';
  END IF;

  -- An episode may only be linked when the caller owns that analysis.
  IF p_episode_id IS NOT NULL AND NOT public.is_episode_owner(p_episode_id, v_user) THEN
    RAISE EXCEPTION 'Forbidden' USING errcode = '42501';
  END IF;

  UPDATE public.profile_recommendations
  SET state = p_state,
      saved_at = CASE
        WHEN p_state = 'saved' THEN COALESCE(saved_at, now())
        WHEN p_state = 'dismissed' THEN saved_at
        ELSE NULL
      END,
      dismissed_at = CASE WHEN p_state = 'dismissed' THEN now() ELSE NULL END,
      analyzed_episode_id = COALESCE(p_episode_id, analyzed_episode_id),
      updated_at = now()
  WHERE id = p_recommendation_id
    AND user_id = v_user
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recommendation not found' USING errcode = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- Scheduled generation: which profiles still need this week's edition.
-- One indexed query instead of an N+1 sweep from the edge function, ordered so
-- the profile that has waited longest goes first. Service-role only.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_profiles_needing_recommendations(
  _week_key text,
  _limit integer DEFAULT 25
)
RETURNS TABLE (
  profile_id uuid,
  user_id uuid,
  last_generated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         p.user_id,
         (SELECT max(b.generated_at)
            FROM public.recommendation_batches b
           WHERE b.profile_id = p.id) AS last_generated_at
  FROM public.user_startup_profiles p
  JOIN public.user_subscriptions s ON s.user_id = p.user_id
  WHERE p.user_id IS NOT NULL
    AND s.tier = 'series_z'
    AND NOT EXISTS (
      SELECT 1
      FROM public.recommendation_batches b
      WHERE b.profile_id = p.id
        AND b.week_key = _week_key
    )
  ORDER BY last_generated_at NULLS FIRST, p.created_at
  LIMIT greatest(1, least(_limit, 200));
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.discovery_content TO authenticated;
GRANT ALL ON public.discovery_content TO service_role;

GRANT SELECT ON public.profile_recommendation_contexts TO authenticated;
GRANT ALL ON public.profile_recommendation_contexts TO service_role;

GRANT SELECT ON public.recommendation_batches TO authenticated;
GRANT ALL ON public.recommendation_batches TO service_role;

GRANT SELECT ON public.profile_recommendations TO authenticated;
GRANT ALL ON public.profile_recommendations TO service_role;

GRANT SELECT, INSERT ON public.recommendation_events TO authenticated;
GRANT ALL ON public.recommendation_events TO service_role;

REVOKE EXECUTE ON FUNCTION public.discovery_week_key(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discovery_week_key(timestamptz) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.owns_startup_profile(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_startup_profile(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_recommendation_state(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_recommendation_state(uuid, text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.list_profiles_needing_recommendations(text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_profiles_needing_recommendations(text, integer)
  TO service_role;