-- Persist which startup profile each analysis was generated for.
ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS analyzed_profile_id uuid REFERENCES public.user_startup_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS analyzed_profile_name_snapshot text;

CREATE INDEX IF NOT EXISTS idx_episodes_analyzed_profile_id
  ON public.episodes (analyzed_profile_id);

CREATE INDEX IF NOT EXISTS idx_episodes_owner_url_profile
  ON public.episodes (analyzed_by, url, analyzed_profile_id);

-- Boardroom-only collaboration gate.
CREATE OR REPLACE FUNCTION public.user_has_boardroom_plan(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions s
    WHERE s.user_id = _user_id
      AND s.tier = 'series_z'
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_boardroom_plan(uuid) TO authenticated;

-- Keep the existing helper name but align behavior to Boardroom-only sharing.
CREATE OR REPLACE FUNCTION public.user_has_paid_plan(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_boardroom_plan(_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.user_has_paid_plan(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.analysis_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  grantee_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer')),
  granted_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (episode_id, grantee_user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_analysis_access_grants_grantee
  ON public.analysis_access_grants (grantee_user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_access_grants_episode
  ON public.analysis_access_grants (episode_id);

CREATE TABLE IF NOT EXISTS public.analysis_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer')),
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_analysis_invites_episode
  ON public.analysis_invites (episode_id);
CREATE INDEX IF NOT EXISTS idx_analysis_invites_status
  ON public.analysis_invites (status);
CREATE INDEX IF NOT EXISTS idx_analysis_invites_email_status
  ON public.analysis_invites (invited_email, status);

ALTER TABLE public.analysis_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_episode_owner(_episode_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.episodes e
    WHERE e.id = _episode_id
      AND e.analyzed_by = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_episode_owner(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_user_view_invited_episode(_episode_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.analysis_access_grants g
    WHERE g.episode_id = _episode_id
      AND g.grantee_user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_user_view_invited_episode(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Owners and grantees can view analysis grants" ON public.analysis_access_grants;
CREATE POLICY "Owners and grantees can view analysis grants"
ON public.analysis_access_grants
FOR SELECT
TO authenticated
USING (
  grantee_user_id = auth.uid()
  OR granted_by_user_id = auth.uid()
  OR public.is_episode_owner(episode_id, auth.uid())
);

DROP POLICY IF EXISTS "Episode owners can grant invited analysis access" ON public.analysis_access_grants;
CREATE POLICY "Episode owners can grant invited analysis access"
ON public.analysis_access_grants
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_episode_owner(episode_id, auth.uid())
  AND granted_by_user_id = auth.uid()
  AND public.user_has_boardroom_plan(auth.uid())
);

DROP POLICY IF EXISTS "Episode owners can revoke invited analysis access" ON public.analysis_access_grants;
CREATE POLICY "Episode owners can revoke invited analysis access"
ON public.analysis_access_grants
FOR DELETE
TO authenticated
USING (
  public.is_episode_owner(episode_id, auth.uid())
);

DROP POLICY IF EXISTS "Owners can view analysis invites" ON public.analysis_invites;
CREATE POLICY "Owners can view analysis invites"
ON public.analysis_invites
FOR SELECT
TO authenticated
USING (public.is_episode_owner(episode_id, auth.uid()));

DROP POLICY IF EXISTS "Owners can create analysis invites" ON public.analysis_invites;
CREATE POLICY "Owners can create analysis invites"
ON public.analysis_invites
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_episode_owner(episode_id, auth.uid())
  AND invited_by_user_id = auth.uid()
  AND public.user_has_boardroom_plan(auth.uid())
);

DROP POLICY IF EXISTS "Owners can update analysis invites" ON public.analysis_invites;
CREATE POLICY "Owners can update analysis invites"
ON public.analysis_invites
FOR UPDATE
TO authenticated
USING (public.is_episode_owner(episode_id, auth.uid()))
WITH CHECK (public.is_episode_owner(episode_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view invited analyses" ON public.episodes;
CREATE POLICY "Members can view invited analyses"
ON public.episodes
FOR SELECT
TO authenticated
USING (public.can_user_view_invited_episode(id, auth.uid()));

DROP POLICY IF EXISTS "Members can view lessons for invited analyses" ON public.lessons;
CREATE POLICY "Members can view lessons for invited analyses"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  episode_id IS NOT NULL
  AND public.can_user_view_invited_episode(episode_id, auth.uid())
);

DROP POLICY IF EXISTS "Members can view callouts for invited analyses" ON public.chavel_callouts;
CREATE POLICY "Members can view callouts for invited analyses"
ON public.chavel_callouts
FOR SELECT
TO authenticated
USING (
  episode_id IS NOT NULL
  AND public.can_user_view_invited_episode(episode_id, auth.uid())
);

DROP POLICY IF EXISTS "Members can view personalized insights for invited analyses" ON public.personalized_insights;
CREATE POLICY "Members can view personalized insights for invited analyses"
ON public.personalized_insights
FOR SELECT
TO authenticated
USING (
  lesson_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.lessons l
    WHERE l.id = personalized_insights.lesson_id
      AND l.episode_id IS NOT NULL
      AND public.can_user_view_invited_episode(l.episode_id, auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.accept_analysis_invite(p_token_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.analysis_invites%ROWTYPE;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.analysis_invites
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found' USING errcode = 'P0002';
  END IF;

  IF v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'This invitation has been revoked' USING errcode = 'P0001';
  END IF;

  IF v_invite.status = 'expired'
     OR (v_invite.status = 'pending' AND v_invite.expires_at < now()) THEN
    UPDATE public.analysis_invites
    SET status = 'expired'
    WHERE id = v_invite.id
      AND status <> 'expired';

    RAISE EXCEPTION 'This invitation has expired' USING errcode = 'P0001';
  END IF;

  INSERT INTO public.analysis_access_grants (episode_id, grantee_user_id, role, granted_by_user_id)
  VALUES (v_invite.episode_id, v_user, v_invite.role, v_invite.invited_by_user_id)
  ON CONFLICT (episode_id, grantee_user_id, role) DO NOTHING;

  UPDATE public.analysis_invites
  SET status = 'accepted',
      accepted_at = COALESCE(accepted_at, now()),
      accepted_by_user_id = COALESCE(accepted_by_user_id, v_user)
  WHERE id = v_invite.id;

  RETURN v_invite.episode_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_analysis_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_analysis_invite(text) TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.analysis_access_grants TO authenticated;
GRANT ALL ON public.analysis_access_grants TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.analysis_invites TO authenticated;
GRANT ALL ON public.analysis_invites TO service_role;
