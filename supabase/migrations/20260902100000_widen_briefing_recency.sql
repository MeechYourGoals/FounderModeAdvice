-- Widen briefing recency, and stop the age rule from hiding the curated library.
--
-- 20260829120000_enforce_daily_brief_freshness.sql made "published in the last
-- 30 days" a hard servability rule on ALL of discovery_content. The Inspiration
-- Library it was applied to is 2000-2023 material (Paul Graham, Sam Altman,
-- Steve Blank), so the rule hid 100% of it: the Inspiration tab went blank, the
-- curated fallback inside generate-recommendations returned nothing, and with no
-- search provider keys configured every weekly batch resolved to status 'empty'.
--
-- Two separate things were conflated. Recency is a property of *discovered news*.
-- Servability is a property of *any row we are willing to show*. This migration
-- widens the first to a year and exempts editorially curated rows from it
-- entirely, which is the part that actually brings content back. A stale,
-- non-curated, or undated discovered row is still unservable.
--
-- Re-runnable on purpose: the freshness migration already exists twice in this
-- history (20260829155955_37a6ce9f-... is a byte-identical re-emit), so assume a
-- third re-emit is possible. RLS SELECT policies are OR-ed, so a re-emit could
-- only widen access, never re-break it; the backfill below is idempotent.

-- ---------------------------------------------------------------------------
-- 1. Recency: 30 days -> 365 days. Undated and far-future rows still fail.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_daily_brief_content_fresh(
  _published_at timestamptz,
  _at timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT _published_at IS NOT NULL
    AND _published_at >= _at - interval '365 days'
    AND _published_at <= _at + interval '5 minutes';
$$;

REVOKE EXECUTE ON FUNCTION public.is_daily_brief_content_fresh(timestamptz, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_daily_brief_content_fresh(timestamptz, timestamptz)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Servability: curated rows are editorial and do not expire.
--
-- is_curated already means "an editor owns this row" and is never set by
-- persistContent (its upsert uses ignoreDuplicates precisely so editor-owned
-- columns stay authoritative when discovery rediscovers a curated URL), so it
-- is the right flag and needs no new column.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_discovery_content_servable(
  _is_curated boolean,
  _published_at timestamptz,
  _at timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT coalesce(_is_curated, false)
      OR public.is_daily_brief_content_fresh(_published_at, _at);
$$;

REVOKE EXECUTE ON FUNCTION public.is_discovery_content_servable(boolean, timestamptz, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_discovery_content_servable(boolean, timestamptz, timestamptz)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Browse policy
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can browse fresh active discovery content"
  ON public.discovery_content;
DROP POLICY IF EXISTS "Authenticated users can browse servable discovery content"
  ON public.discovery_content;
CREATE POLICY "Authenticated users can browse servable discovery content"
ON public.discovery_content
FOR SELECT
TO authenticated
USING (active AND public.is_discovery_content_servable(is_curated, published_at));

-- ---------------------------------------------------------------------------
-- 4. Restore admin curation.
--
-- The freshness migration dropped "Admins manage discovery content" because it
-- was an ALL policy, and an ALL policy is also a permissive SELECT policy that
-- would OR past the servability rule above. Splitting it by command keeps that
-- hardening: admins get writes, and read the library under the same rule as
-- everyone else. No SELECT policy is added here.
--
-- The pre-existing grant on this table is SELECT-only, so the old ALL policy
-- could never actually write either; the grant below is what makes curation
-- through the Supabase table editor work as docs/discovery-setup.md describes.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins insert discovery content" ON public.discovery_content;
CREATE POLICY "Admins insert discovery content"
ON public.discovery_content
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update discovery content" ON public.discovery_content;
CREATE POLICY "Admins update discovery content"
ON public.discovery_content
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete discovery content" ON public.discovery_content;
CREATE POLICY "Admins delete discovery content"
ON public.discovery_content
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.discovery_content TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Refunding a rate limit slot.
--
-- generate-recommendations consumes the manual-refresh allowance BEFORE doing
-- any work, so two presses against a deployment with no search provider keys
-- cost a user their whole day for nothing. The refund rule is deliberately
-- "no work was performed", not "no results": a refresh that made provider and
-- model calls and came back empty still cost money and still counts.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refund_rate_limit(
  _user_id uuid,
  _key text,
  _window interval
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Identical bucket expression to check_and_increment_rate_limit; a different
  -- one here would decrement a bucket that was never incremented.
  v_bucket timestamptz := date_trunc('second', now()) - (extract(epoch from now())::bigint % extract(epoch from _window)::bigint) * interval '1 second';
BEGIN
  UPDATE public.rate_limits
     SET count = greatest(0, count - 1)
   WHERE user_id = _user_id AND key = _key AND window_start = v_bucket;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_rate_limit(uuid, text, interval)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_rate_limit(uuid, text, interval) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Undo the batch backfill the freshness migration ran.
--
-- That migration zeroed item_count and flipped 'ready' -> 'empty' for every
-- batch whose items were all older than 30 days, which under the old rule was
-- all of them. Recount under the servability rule and restore the ones that
-- do have showable items. Genuinely failed batches are excluded so nothing is
-- resurrected that never worked.
-- ---------------------------------------------------------------------------

WITH servable_counts AS (
  SELECT b.id,
         count(c.id)::integer AS servable_count
    FROM public.recommendation_batches b
    LEFT JOIN public.profile_recommendations r ON r.batch_id = b.id
    LEFT JOIN public.discovery_content c
      ON c.id = r.content_id
     AND c.active
     AND public.is_discovery_content_servable(c.is_curated, c.published_at)
   WHERE b.status IN ('empty', 'ready')
     AND b.error_message IS NULL
   GROUP BY b.id
)
UPDATE public.recommendation_batches b
SET item_count = s.servable_count,
    status = CASE WHEN s.servable_count > 0 AND b.status = 'empty' THEN 'ready' ELSE b.status END,
    generation_stats = coalesce(b.generation_stats, '{}'::jsonb) || jsonb_build_object(
      'servability_backfill_at', now(),
      'eligible_items', s.servable_count
    )
FROM servable_counts s
WHERE b.id = s.id
  AND (b.item_count IS DISTINCT FROM s.servable_count
       OR (s.servable_count > 0 AND b.status = 'empty'));

COMMENT ON COLUMN public.recommendation_batches.generation_stats IS
  'Counts, provider ids, and the search queries the edition was built from. Queries derive from the owner''s own profile; no other user content.';
