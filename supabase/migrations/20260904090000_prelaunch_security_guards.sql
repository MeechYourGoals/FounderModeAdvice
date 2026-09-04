-- Founder Mode Advice pre-launch security guards.
-- Re-runnable so it can repair policy/grant drift in the hosted project.

-- ---------------------------------------------------------------------------
-- Guard 2: private analysis content stays on public.episodes; public discovery
-- stays on the metadata-only public.discovery_content table.
-- ---------------------------------------------------------------------------

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- Remove any legacy SELECT policy that applies to anon/PUBLIC, has no predicate,
-- or is literally USING (true). RLS policies are permissive (OR-ed), so one
-- stale broad policy would bypass every restrictive owner/share policy below.
DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'episodes'
      AND cmd = 'SELECT'
      AND (
        roles && ARRAY['public', 'anon']::name[]
        OR lower(regexp_replace(coalesce(qual, ''), '\s', '', 'g')) IN ('', 'true', '(true)')
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.episodes', policy_row.policyname);
  END LOOP;
END
$$;

-- Re-assert every intended direct-table SELECT path with an explicit role.
DROP POLICY IF EXISTS "Users can read episodes they analyzed" ON public.episodes;
CREATE POLICY "Users can read episodes they analyzed"
ON public.episodes FOR SELECT TO authenticated
USING (analyzed_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can read all episodes" ON public.episodes;
CREATE POLICY "Admins can read all episodes"
ON public.episodes FOR SELECT TO authenticated
USING (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Members can view shared episodes" ON public.episodes;
CREATE POLICY "Members can view shared episodes"
ON public.episodes FOR SELECT TO authenticated
USING (public.user_can_view_episode(id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Members can view invited analyses" ON public.episodes;
CREATE POLICY "Members can view invited analyses"
ON public.episodes FOR SELECT TO authenticated
USING (public.can_user_view_invited_episode(id, (SELECT auth.uid())));

REVOKE ALL ON TABLE public.episodes FROM anon;
REVOKE INSERT, UPDATE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.episodes FROM authenticated;
GRANT SELECT, DELETE ON TABLE public.episodes TO authenticated;
GRANT ALL ON TABLE public.episodes TO service_role;

-- Published/inspiration discovery uses a separate metadata catalog. It has no
-- custom_prompt, file_path, transcript, analyzer diagnostics, or private output.
REVOKE ALL ON TABLE public.discovery_content FROM anon;
GRANT SELECT ON TABLE public.discovery_content TO authenticated;

-- ---------------------------------------------------------------------------
-- Guard 3: subscription tier and usage counters are server-owned.
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_monthly_usage ENABLE ROW LEVEL SECURITY;

-- Drop every current policy on these two tables, then recreate the only client
-- path: authenticated users may read their own row. service_role bypasses RLS.
DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('user_subscriptions', 'user_monthly_usage')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', policy_row.policyname, policy_row.tablename);
  END LOOP;
END
$$;

CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view their own usage"
ON public.user_monthly_usage FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.user_subscriptions, public.user_monthly_usage FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.user_subscriptions, public.user_monthly_usage
  FROM authenticated;
GRANT SELECT ON TABLE public.user_subscriptions, public.user_monthly_usage TO authenticated;
GRANT ALL ON TABLE public.user_subscriptions, public.user_monthly_usage TO service_role;

-- ---------------------------------------------------------------------------
-- Guard 4: invite links are single-recipient and single-use.
-- ---------------------------------------------------------------------------

-- Owners no longer mutate invite rows directly. Dedicated revoke RPCs below
-- permit only the one supported owner action and keep membership removal atomic.
-- Remove every UPDATE/DELETE policy so legacy policy names or hosted drift do
-- not become exploitable if a table grant is accidentally reintroduced later.
DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('folder_invites', 'analysis_invites')
      AND cmd IN ('UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', policy_row.policyname, policy_row.tablename);
  END LOOP;
END
$$;
REVOKE UPDATE, DELETE ON TABLE public.folder_invites, public.analysis_invites FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.folder_invites, public.analysis_invites TO authenticated;
GRANT ALL ON TABLE public.folder_invites, public.analysis_invites TO service_role;

CREATE OR REPLACE FUNCTION public.accept_folder_invite(p_token_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.folder_invites%ROWTYPE;
  v_user uuid := auth.uid();
  v_email text := lower(nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), ''));
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  SELECT * INTO v_invite
  FROM public.folder_invites
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found' USING errcode = 'P0002';
  END IF;

  IF v_invite.status = 'accepted' OR v_invite.accepted_by_user_id IS NOT NULL THEN
    IF v_invite.status = 'accepted' AND v_invite.accepted_by_user_id = v_user THEN
      RETURN v_invite.folder_id;
    END IF;
    RAISE EXCEPTION 'This invitation has already been used' USING errcode = 'P0001';
  END IF;

  IF v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'This invitation has been revoked' USING errcode = 'P0001';
  END IF;
  IF v_invite.status = 'expired' OR v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'This invitation has expired' USING errcode = 'P0001';
  END IF;
  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'This invitation is no longer valid' USING errcode = 'P0001';
  END IF;
  IF v_email IS NULL OR lower(btrim(v_invite.invited_email)) <> v_email THEN
    RAISE EXCEPTION 'Sign in with the email address that was invited' USING errcode = 'P0001';
  END IF;

  INSERT INTO public.folder_members (folder_id, user_id, role, invited_by_user_id)
  VALUES (v_invite.folder_id, v_user, v_invite.role, v_invite.invited_by_user_id)
  ON CONFLICT (folder_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.folder_invites
  SET status = 'accepted', accepted_at = now(), accepted_by_user_id = v_user
  WHERE id = v_invite.id AND status = 'pending' AND accepted_by_user_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invitation has already been used' USING errcode = 'P0001';
  END IF;

  RETURN v_invite.folder_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_analysis_invite(p_token_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.analysis_invites%ROWTYPE;
  v_user uuid := auth.uid();
  v_email text := lower(nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), ''));
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  SELECT * INTO v_invite
  FROM public.analysis_invites
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found' USING errcode = 'P0002';
  END IF;

  IF v_invite.status = 'accepted' OR v_invite.accepted_by_user_id IS NOT NULL THEN
    IF v_invite.status = 'accepted' AND v_invite.accepted_by_user_id = v_user THEN
      RETURN v_invite.episode_id;
    END IF;
    RAISE EXCEPTION 'This invitation has already been used' USING errcode = 'P0001';
  END IF;

  IF v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'This invitation has been revoked' USING errcode = 'P0001';
  END IF;
  IF v_invite.status = 'expired' OR v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'This invitation has expired' USING errcode = 'P0001';
  END IF;
  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'This invitation is no longer valid' USING errcode = 'P0001';
  END IF;
  IF v_email IS NULL OR lower(btrim(v_invite.invited_email)) <> v_email THEN
    RAISE EXCEPTION 'Sign in with the email address that was invited' USING errcode = 'P0001';
  END IF;

  INSERT INTO public.analysis_access_grants
    (episode_id, grantee_user_id, role, granted_by_user_id)
  VALUES
    (v_invite.episode_id, v_user, v_invite.role, v_invite.invited_by_user_id)
  ON CONFLICT (episode_id, grantee_user_id, role) DO NOTHING;

  UPDATE public.analysis_invites
  SET status = 'accepted', accepted_at = now(), accepted_by_user_id = v_user
  WHERE id = v_invite.id AND status = 'pending' AND accepted_by_user_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invitation has already been used' USING errcode = 'P0001';
  END IF;

  RETURN v_invite.episode_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_folder_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.folder_invites%ROWTYPE;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  SELECT * INTO v_invite
  FROM public.folder_invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.is_folder_owner(v_invite.folder_id, v_user) THEN
    RAISE EXCEPTION 'Invite not found' USING errcode = 'P0002';
  END IF;

  UPDATE public.folder_invites SET status = 'revoked' WHERE id = v_invite.id;
  IF v_invite.accepted_by_user_id IS NOT NULL THEN
    DELETE FROM public.folder_members
    WHERE folder_id = v_invite.folder_id AND user_id = v_invite.accepted_by_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_analysis_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.analysis_invites%ROWTYPE;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  SELECT * INTO v_invite
  FROM public.analysis_invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.is_episode_owner(v_invite.episode_id, v_user) THEN
    RAISE EXCEPTION 'Invite not found' USING errcode = 'P0002';
  END IF;

  UPDATE public.analysis_invites SET status = 'revoked' WHERE id = v_invite.id;
  IF v_invite.accepted_by_user_id IS NOT NULL THEN
    DELETE FROM public.analysis_access_grants
    WHERE episode_id = v_invite.episode_id
      AND grantee_user_id = v_invite.accepted_by_user_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_folder_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_analysis_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_folder_invite(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_analysis_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_folder_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_analysis_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_folder_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_analysis_invite(uuid) TO authenticated;
