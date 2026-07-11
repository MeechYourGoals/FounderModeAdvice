-- Fix rate_limits: only SELECT allowed for users; writes go via SECURITY DEFINER function.
DROP POLICY IF EXISTS "Users insert own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users update own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users delete own rate limits" ON public.rate_limits;

-- Revoke anon EXECUTE from trigger functions (they should only run as triggers, not be callable).
REVOKE EXECUTE ON FUNCTION public.enforce_profile_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_bookmarked_episodes_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_bookmarked_lessons_limit() FROM PUBLIC, anon, authenticated;