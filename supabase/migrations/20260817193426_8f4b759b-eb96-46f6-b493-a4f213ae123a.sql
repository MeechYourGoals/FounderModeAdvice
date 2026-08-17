-- Least privilege for the discovery tables: the project grants broad default
-- privileges to anon/authenticated, so narrow them back to what the RLS
-- policies actually allow. RLS already blocks these paths; this removes the
-- grant as well so a future policy mistake cannot open a write path.

REVOKE ALL ON public.discovery_content FROM anon;
REVOKE ALL ON public.profile_recommendation_contexts FROM anon;
REVOKE ALL ON public.recommendation_batches FROM anon;
REVOKE ALL ON public.profile_recommendations FROM anon;
REVOKE ALL ON public.recommendation_events FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.discovery_content FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.profile_recommendation_contexts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.recommendation_batches FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.profile_recommendations FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.recommendation_events FROM authenticated;

-- Admin curation happens with the service role / SQL editor, so the admin
-- ALL policy on discovery_content is intentionally left in place for future
-- use but currently has no matching grant.
GRANT SELECT ON public.discovery_content TO authenticated;
GRANT SELECT ON public.profile_recommendation_contexts TO authenticated;
GRANT SELECT ON public.recommendation_batches TO authenticated;
GRANT SELECT ON public.profile_recommendations TO authenticated;
GRANT SELECT, INSERT ON public.recommendation_events TO authenticated;
GRANT ALL ON public.discovery_content TO service_role;
GRANT ALL ON public.profile_recommendation_contexts TO service_role;
GRANT ALL ON public.recommendation_batches TO service_role;
GRANT ALL ON public.profile_recommendations TO service_role;
GRANT ALL ON public.recommendation_events TO service_role;