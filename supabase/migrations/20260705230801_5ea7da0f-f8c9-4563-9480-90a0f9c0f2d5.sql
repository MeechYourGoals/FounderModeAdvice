-- Helper: resolve a user's max count for a given resource based on subscription tier.
CREATE OR REPLACE FUNCTION public.get_tier_max(_user_id uuid, _resource text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
BEGIN
  -- Operators with user_roles.role = admin keep unlimited allowances.
  -- Privilege is the database role, never an email allowlist.
  IF public.has_role(_user_id, 'admin') THEN
    RETURN 2147483647;
  END IF;

  SELECT tier INTO v_tier FROM public.user_subscriptions WHERE user_id = _user_id;
  v_tier := coalesce(v_tier, 'free');

  IF _resource = 'profile' THEN
    RETURN CASE v_tier WHEN 'free' THEN 1 WHEN 'seed' THEN 5 WHEN 'series_z' THEN 2147483647 ELSE 1 END;
  ELSIF _resource = 'bookmark' THEN
    RETURN CASE v_tier WHEN 'free' THEN 5 WHEN 'seed' THEN 100 WHEN 'series_z' THEN 2147483647 ELSE 5 END;
  END IF;

  RETURN 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_tier_max(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tier_max(uuid, text) TO authenticated, service_role;

-- Trigger: enforce startup profile limit.
CREATE OR REPLACE FUNCTION public.enforce_profile_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
  v_count integer;
BEGIN
  v_max := public.get_tier_max(NEW.user_id, 'profile');
  SELECT count(*) INTO v_count FROM public.user_startup_profiles WHERE user_id = NEW.user_id;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Startup profile limit reached for your plan (%).', v_max
      USING errcode = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_limit_trg ON public.user_startup_profiles;
CREATE TRIGGER enforce_profile_limit_trg
  BEFORE INSERT ON public.user_startup_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_limit();

-- Trigger: enforce bookmarked episodes limit.
CREATE OR REPLACE FUNCTION public.enforce_bookmarked_episodes_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
  v_count integer;
BEGIN
  v_max := public.get_tier_max(NEW.user_id, 'bookmark');
  SELECT count(*) INTO v_count FROM public.bookmarked_episodes WHERE user_id = NEW.user_id;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Bookmark limit reached for your plan (%).', v_max
      USING errcode = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_bookmarked_episodes_limit_trg ON public.bookmarked_episodes;
CREATE TRIGGER enforce_bookmarked_episodes_limit_trg
  BEFORE INSERT ON public.bookmarked_episodes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bookmarked_episodes_limit();

-- Trigger: enforce bookmarked lessons limit (shares bookmark cap).
CREATE OR REPLACE FUNCTION public.enforce_bookmarked_lessons_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
  v_count integer;
BEGIN
  v_max := public.get_tier_max(NEW.user_id, 'bookmark');
  SELECT count(*) INTO v_count FROM public.bookmarked_lessons WHERE user_id = NEW.user_id;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Bookmark limit reached for your plan (%).', v_max
      USING errcode = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_bookmarked_lessons_limit_trg ON public.bookmarked_lessons;
CREATE TRIGGER enforce_bookmarked_lessons_limit_trg
  BEFORE INSERT ON public.bookmarked_lessons
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bookmarked_lessons_limit();