-- Make Daily Brief freshness a server-side serving invariant. Historical rows
-- remain stored for audit/novelty, but authenticated Data API reads cannot
-- resolve stale, undated, malformed (impossible for timestamptz), or far-future
-- catalog records. The inner joins used by recommendation reads consequently
-- exclude legacy associations for every existing account.

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
    AND _published_at >= _at - interval '30 days'
    AND _published_at <= _at + interval '5 minutes';
$$;

REVOKE EXECUTE ON FUNCTION public.is_daily_brief_content_fresh(timestamptz, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_daily_brief_content_fresh(timestamptz, timestamptz)
  TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can browse active discovery content"
  ON public.discovery_content;
CREATE POLICY "Authenticated users can browse fresh active discovery content"
ON public.discovery_content
FOR SELECT
TO authenticated
USING (active AND public.is_daily_brief_content_fresh(published_at));

-- The old ALL policy was also a permissive SELECT policy and could bypass the
-- freshness policy for admins. Curation writes use service_role in this app.
DROP POLICY IF EXISTS "Admins manage discovery content" ON public.discovery_content;

-- Keep batch metadata honest without deleting recommendation/history rows.
WITH fresh_counts AS (
  SELECT b.id,
         count(c.id)::integer AS fresh_count,
         max(extract(epoch FROM (now() - c.published_at)) / 86400.0)
           FILTER (WHERE c.id IS NOT NULL) AS oldest_item_age_days
  FROM public.recommendation_batches b
  LEFT JOIN public.profile_recommendations r ON r.batch_id = b.id
  LEFT JOIN public.discovery_content c
    ON c.id = r.content_id
   AND c.active
   AND public.is_daily_brief_content_fresh(c.published_at)
  GROUP BY b.id
)
UPDATE public.recommendation_batches b
SET item_count = f.fresh_count,
    status = CASE WHEN f.fresh_count = 0 AND b.status = 'ready' THEN 'empty' ELSE b.status END,
    generation_stats = coalesce(b.generation_stats, '{}'::jsonb) || jsonb_build_object(
      'freshness_backfill_at', now(),
      'eligible_items', f.fresh_count,
      'daily_brief_oldest_item_age_days', f.oldest_item_age_days,
      'daily_brief_freshness_violation', 0
    )
FROM fresh_counts f
WHERE b.id = f.id
  AND (b.item_count IS DISTINCT FROM f.fresh_count OR (f.fresh_count = 0 AND b.status = 'ready'));