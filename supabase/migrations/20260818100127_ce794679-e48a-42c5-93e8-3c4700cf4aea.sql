CREATE OR REPLACE FUNCTION public.is_founder_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(coalesce(u.email, '')) IN ('ccamechi@gmail.com','chrisatown@gmail.com','ca@saintmarlolabs.com')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_founder_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_founder_user(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_tier_max(_user_id uuid, _resource text)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tier text;
BEGIN
  -- Founder super admins: unlimited.
  IF public.is_founder_user(_user_id) THEN
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

CREATE OR REPLACE FUNCTION public.user_has_boardroom_plan(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_founder_user(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id = _user_id AND s.tier = 'series_z');
$$;
REVOKE EXECUTE ON FUNCTION public.user_has_boardroom_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_boardroom_plan(uuid) TO authenticated, service_role;