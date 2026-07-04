-- Folder-level sharing (v1)
--
-- Lets a folder owner invite collaborators to a single `episode_folders` folder
-- without exposing the rest of their workspace. Invited users get read-only
-- ("viewer") access to that folder, the episodes assigned to it, and the
-- insights (lessons / personalized insights / callouts) for those episodes.
--
-- Design notes:
--   * Invites are link-based. The raw token lives only in the invite URL; the
--     database stores a SHA-256 hash of it (hashing is done client-side via the
--     Web Crypto API, so no pgcrypto dependency is required here).
--   * Membership grants access via additive, permissive SELECT policies. Owner
--     and admin policies are left untouched — collaborators only ever gain
--     read access to the one folder they were invited to.
--   * Helper functions are SECURITY DEFINER and owned by the migration role
--     (a table owner), so they bypass RLS on the tables they read. This is the
--     same pattern as the existing public.has_role() helper and avoids the
--     infinite-recursion trap of referencing a table inside its own policy.

-- ---------- Roles ----------
DO $$ BEGIN
  CREATE TYPE public.folder_role AS ENUM ('viewer', 'editor', 'owner');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ---------- Membership ----------
CREATE TABLE IF NOT EXISTS public.folder_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.episode_folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.folder_role NOT NULL DEFAULT 'viewer',
  invited_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folder_id, user_id)
);

CREATE INDEX IF NOT EXISTS folder_members_user_id_idx ON public.folder_members (user_id);
CREATE INDEX IF NOT EXISTS folder_members_folder_id_idx ON public.folder_members (folder_id);

ALTER TABLE public.folder_members ENABLE ROW LEVEL SECURITY;

-- ---------- Invites ----------
CREATE TABLE IF NOT EXISTS public.folder_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.episode_folders(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by_user_id uuid NOT NULL,
  role public.folder_role NOT NULL DEFAULT 'viewer',
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by_user_id uuid
);

CREATE INDEX IF NOT EXISTS folder_invites_folder_id_idx ON public.folder_invites (folder_id);
CREATE INDEX IF NOT EXISTS folder_invites_status_idx ON public.folder_invites (status);

ALTER TABLE public.folder_invites ENABLE ROW LEVEL SECURITY;

-- ---------- Helper functions (SECURITY DEFINER, bypass RLS) ----------

CREATE OR REPLACE FUNCTION public.is_folder_owner(_folder_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.episode_folders f WHERE f.id = _folder_id AND f.user_id = _user_id); $$;

CREATE OR REPLACE FUNCTION public.is_folder_member(_folder_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.folder_members m WHERE m.folder_id = _folder_id AND m.user_id = _user_id); $$;

CREATE OR REPLACE FUNCTION public.user_can_view_episode(_episode_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.episode_folder_assignments efa
    JOIN public.folder_members m ON m.folder_id = efa.folder_id
    WHERE efa.episode_id = _episode_id AND m.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_lesson(_lesson_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = _lesson_id AND l.episode_id IS NOT NULL
      AND public.user_can_view_episode(l.episode_id, _user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_paid_plan(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions s
    WHERE s.user_id = _user_id AND s.tier IN ('seed', 'series_z')
  );
$$;

-- ---------- RLS: folder_members ----------
DROP POLICY IF EXISTS "Owners and members can view membership" ON public.folder_members;
DROP POLICY IF EXISTS "Owners and members can view members" ON public.folder_members;
CREATE POLICY "Owners and members can view membership"
ON public.folder_members FOR SELECT TO authenticated
USING (public.is_folder_owner(folder_id, auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can add members" ON public.folder_members;
CREATE POLICY "Owners can add members"
ON public.folder_members FOR INSERT TO authenticated
WITH CHECK (public.is_folder_owner(folder_id, auth.uid()) AND public.user_has_paid_plan(auth.uid()));

DROP POLICY IF EXISTS "Owners can remove members, members can leave" ON public.folder_members;
DROP POLICY IF EXISTS "Owners can remove members" ON public.folder_members;
CREATE POLICY "Owners can remove members, members can leave"
ON public.folder_members FOR DELETE TO authenticated
USING (public.is_folder_owner(folder_id, auth.uid()) OR user_id = auth.uid());

-- ---------- RLS: folder_invites ----------
DROP POLICY IF EXISTS "Owners can view their folder invites" ON public.folder_invites;
DROP POLICY IF EXISTS "Owners can view folder invites" ON public.folder_invites;
CREATE POLICY "Owners can view their folder invites"
ON public.folder_invites FOR SELECT TO authenticated
USING (public.is_folder_owner(folder_id, auth.uid()));

DROP POLICY IF EXISTS "Owners can create folder invites" ON public.folder_invites;
CREATE POLICY "Owners can create folder invites"
ON public.folder_invites FOR INSERT TO authenticated
WITH CHECK (
  public.is_folder_owner(folder_id, auth.uid())
  AND invited_by_user_id = auth.uid()
  AND public.user_has_paid_plan(auth.uid())
);

DROP POLICY IF EXISTS "Owners can update (revoke) folder invites" ON public.folder_invites;
DROP POLICY IF EXISTS "Owners can update folder invites" ON public.folder_invites;
CREATE POLICY "Owners can update (revoke) folder invites"
ON public.folder_invites FOR UPDATE TO authenticated
USING (public.is_folder_owner(folder_id, auth.uid()))
WITH CHECK (public.is_folder_owner(folder_id, auth.uid()));

-- ---------- RLS: additive read access for collaborators ----------
DROP POLICY IF EXISTS "Members can view shared folders" ON public.episode_folders;
CREATE POLICY "Members can view shared folders"
ON public.episode_folders FOR SELECT TO authenticated
USING (public.is_folder_member(id, auth.uid()));

DROP POLICY IF EXISTS "Members can view shared folder assignments" ON public.episode_folder_assignments;
CREATE POLICY "Members can view shared folder assignments"
ON public.episode_folder_assignments FOR SELECT TO authenticated
USING (public.is_folder_member(folder_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view shared episodes" ON public.episodes;
CREATE POLICY "Members can view shared episodes"
ON public.episodes FOR SELECT TO authenticated
USING (public.user_can_view_episode(id, auth.uid()));

DROP POLICY IF EXISTS "Members can view shared lessons" ON public.lessons;
CREATE POLICY "Members can view shared lessons"
ON public.lessons FOR SELECT TO authenticated
USING (episode_id IS NOT NULL AND public.user_can_view_episode(episode_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view shared personalized insights" ON public.personalized_insights;
CREATE POLICY "Members can view shared personalized insights"
ON public.personalized_insights FOR SELECT TO authenticated
USING (lesson_id IS NOT NULL AND public.user_can_view_lesson(lesson_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view shared callouts" ON public.chavel_callouts;
CREATE POLICY "Members can view shared callouts"
ON public.chavel_callouts FOR SELECT TO authenticated
USING (episode_id IS NOT NULL AND public.user_can_view_episode(episode_id, auth.uid()));

-- ---------- Accept-invite RPC ----------
CREATE OR REPLACE FUNCTION public.accept_folder_invite(p_token_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite public.folder_invites%ROWTYPE;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '28000'; END IF;
  SELECT * INTO v_invite FROM public.folder_invites WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invite not found' USING errcode = 'P0002'; END IF;
  IF v_invite.status = 'revoked' THEN RAISE EXCEPTION 'This invitation has been revoked' USING errcode = 'P0001'; END IF;
  IF v_invite.status = 'expired' OR (v_invite.status = 'pending' AND v_invite.expires_at < now()) THEN
    UPDATE public.folder_invites SET status = 'expired' WHERE id = v_invite.id AND status <> 'expired';
    RAISE EXCEPTION 'This invitation has expired' USING errcode = 'P0001';
  END IF;
  INSERT INTO public.folder_members (folder_id, user_id, role, invited_by_user_id)
  VALUES (v_invite.folder_id, v_user, v_invite.role, v_invite.invited_by_user_id)
  ON CONFLICT (folder_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  UPDATE public.folder_invites
  SET status = 'accepted', accepted_at = COALESCE(accepted_at, now()),
      accepted_by_user_id = COALESCE(accepted_by_user_id, v_user)
  WHERE id = v_invite.id;
  RETURN v_invite.folder_id;
END;
$$;

GRANT SELECT, INSERT, DELETE ON public.folder_members TO authenticated;
GRANT ALL ON public.folder_members TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.folder_invites TO authenticated;
GRANT ALL ON public.folder_invites TO service_role;

GRANT EXECUTE ON FUNCTION public.is_folder_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_folder_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_episode(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_lesson(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_paid_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_folder_invite(text) TO authenticated;

-- =====================================================================
-- Profile targeting + analysis-level invites
-- =====================================================================

ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS analyzed_profile_id uuid REFERENCES public.user_startup_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS analyzed_profile_name_snapshot text;

CREATE INDEX IF NOT EXISTS idx_episodes_analyzed_profile_id ON public.episodes (analyzed_profile_id);
CREATE INDEX IF NOT EXISTS idx_episodes_owner_url_profile ON public.episodes (analyzed_by, url, analyzed_profile_id);

CREATE OR REPLACE FUNCTION public.user_has_boardroom_plan(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id = _user_id AND s.tier = 'series_z');
$$;
GRANT EXECUTE ON FUNCTION public.user_has_boardroom_plan(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_has_paid_plan(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.user_has_boardroom_plan(_user_id); $$;
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
CREATE INDEX IF NOT EXISTS idx_analysis_access_grants_grantee ON public.analysis_access_grants (grantee_user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_access_grants_episode ON public.analysis_access_grants (episode_id);

CREATE TABLE IF NOT EXISTS public.analysis_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer')),
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_analysis_invites_episode ON public.analysis_invites (episode_id);
CREATE INDEX IF NOT EXISTS idx_analysis_invites_status ON public.analysis_invites (status);
CREATE INDEX IF NOT EXISTS idx_analysis_invites_email_status ON public.analysis_invites (invited_email, status);

ALTER TABLE public.analysis_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_episode_owner(_episode_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.episodes e WHERE e.id = _episode_id AND e.analyzed_by = _user_id); $$;
GRANT EXECUTE ON FUNCTION public.is_episode_owner(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_user_view_invited_episode(_episode_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.analysis_access_grants g WHERE g.episode_id = _episode_id AND g.grantee_user_id = _user_id); $$;
GRANT EXECUTE ON FUNCTION public.can_user_view_invited_episode(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Owners and grantees can view analysis grants" ON public.analysis_access_grants;
CREATE POLICY "Owners and grantees can view analysis grants"
ON public.analysis_access_grants FOR SELECT TO authenticated
USING (grantee_user_id = auth.uid() OR granted_by_user_id = auth.uid() OR public.is_episode_owner(episode_id, auth.uid()));

DROP POLICY IF EXISTS "Episode owners can grant invited analysis access" ON public.analysis_access_grants;
CREATE POLICY "Episode owners can grant invited analysis access"
ON public.analysis_access_grants FOR INSERT TO authenticated
WITH CHECK (public.is_episode_owner(episode_id, auth.uid()) AND granted_by_user_id = auth.uid() AND public.user_has_boardroom_plan(auth.uid()));

DROP POLICY IF EXISTS "Episode owners can revoke invited analysis access" ON public.analysis_access_grants;
CREATE POLICY "Episode owners can revoke invited analysis access"
ON public.analysis_access_grants FOR DELETE TO authenticated
USING (public.is_episode_owner(episode_id, auth.uid()));

DROP POLICY IF EXISTS "Owners can view analysis invites" ON public.analysis_invites;
CREATE POLICY "Owners can view analysis invites"
ON public.analysis_invites FOR SELECT TO authenticated
USING (public.is_episode_owner(episode_id, auth.uid()));

DROP POLICY IF EXISTS "Owners can create analysis invites" ON public.analysis_invites;
CREATE POLICY "Owners can create analysis invites"
ON public.analysis_invites FOR INSERT TO authenticated
WITH CHECK (public.is_episode_owner(episode_id, auth.uid()) AND invited_by_user_id = auth.uid() AND public.user_has_boardroom_plan(auth.uid()));

DROP POLICY IF EXISTS "Owners can update analysis invites" ON public.analysis_invites;
CREATE POLICY "Owners can update analysis invites"
ON public.analysis_invites FOR UPDATE TO authenticated
USING (public.is_episode_owner(episode_id, auth.uid()))
WITH CHECK (public.is_episode_owner(episode_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view invited analyses" ON public.episodes;
CREATE POLICY "Members can view invited analyses"
ON public.episodes FOR SELECT TO authenticated
USING (public.can_user_view_invited_episode(id, auth.uid()));

DROP POLICY IF EXISTS "Members can view lessons for invited analyses" ON public.lessons;
CREATE POLICY "Members can view lessons for invited analyses"
ON public.lessons FOR SELECT TO authenticated
USING (episode_id IS NOT NULL AND public.can_user_view_invited_episode(episode_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view callouts for invited analyses" ON public.chavel_callouts;
CREATE POLICY "Members can view callouts for invited analyses"
ON public.chavel_callouts FOR SELECT TO authenticated
USING (episode_id IS NOT NULL AND public.can_user_view_invited_episode(episode_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view personalized insights for invited analyses" ON public.personalized_insights;
CREATE POLICY "Members can view personalized insights for invited analyses"
ON public.personalized_insights FOR SELECT TO authenticated
USING (
  lesson_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = personalized_insights.lesson_id
      AND l.episode_id IS NOT NULL
      AND public.can_user_view_invited_episode(l.episode_id, auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.accept_analysis_invite(p_token_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite public.analysis_invites%ROWTYPE;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '28000'; END IF;
  SELECT * INTO v_invite FROM public.analysis_invites WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invite not found' USING errcode = 'P0002'; END IF;
  IF v_invite.status = 'revoked' THEN RAISE EXCEPTION 'This invitation has been revoked' USING errcode = 'P0001'; END IF;
  IF v_invite.status = 'expired' OR (v_invite.status = 'pending' AND v_invite.expires_at < now()) THEN
    UPDATE public.analysis_invites SET status = 'expired' WHERE id = v_invite.id AND status <> 'expired';
    RAISE EXCEPTION 'This invitation has expired' USING errcode = 'P0001';
  END IF;
  INSERT INTO public.analysis_access_grants (episode_id, grantee_user_id, role, granted_by_user_id)
  VALUES (v_invite.episode_id, v_user, v_invite.role, v_invite.invited_by_user_id)
  ON CONFLICT (episode_id, grantee_user_id, role) DO NOTHING;
  UPDATE public.analysis_invites
  SET status = 'accepted', accepted_at = COALESCE(accepted_at, now()),
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

-- =====================================================================
-- Insight comments + mentions
-- =====================================================================

CREATE OR REPLACE FUNCTION public.user_can_access_episode(_episode_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_episode_owner(_episode_id, _user_id)
      OR public.user_can_view_episode(_episode_id, _user_id)
      OR public.can_user_view_invited_episode(_episode_id, _user_id);
$$;
GRANT EXECUTE ON FUNCTION public.user_can_access_episode(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.insight_belongs_to_episode(_insight_type text, _insight_id uuid, _episode_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE _insight_type
    WHEN 'lesson' THEN EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = _insight_id AND l.episode_id = _episode_id)
    WHEN 'callout' THEN EXISTS (SELECT 1 FROM public.chavel_callouts c WHERE c.id = _insight_id AND c.episode_id = _episode_id)
    WHEN 'personalized_insight' THEN EXISTS (
      SELECT 1 FROM public.personalized_insights pi
      JOIN public.lessons l ON l.id = pi.lesson_id
      WHERE pi.id = _insight_id AND l.episode_id = _episode_id
    )
    ELSE false
  END;
$$;
GRANT EXECUTE ON FUNCTION public.insight_belongs_to_episode(text, uuid, uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.insight_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN ('lesson','callout','personalized_insight')),
  insight_id uuid NOT NULL,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  visibility text NOT NULL DEFAULT 'shared' CHECK (visibility IN ('shared','private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insight_comments_episode ON public.insight_comments (episode_id, created_at);
CREATE INDEX IF NOT EXISTS idx_insight_comments_insight ON public.insight_comments (insight_id, created_at);
CREATE INDEX IF NOT EXISTS idx_insight_comments_author ON public.insight_comments (author_user_id);

DROP TRIGGER IF EXISTS update_insight_comments_updated_at ON public.insight_comments;
CREATE TRIGGER update_insight_comments_updated_at
  BEFORE UPDATE ON public.insight_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.insight_comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.insight_comments(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, mentioned_user_id)
);
CREATE INDEX IF NOT EXISTS idx_insight_comment_mentions_user ON public.insight_comment_mentions (mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_insight_comment_mentions_comment ON public.insight_comment_mentions (comment_id);

ALTER TABLE public.insight_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_comment_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with episode access can view shared comments" ON public.insight_comments;
CREATE POLICY "Users with episode access can view shared comments"
ON public.insight_comments FOR SELECT TO authenticated
USING (public.user_can_access_episode(episode_id, auth.uid()) AND (visibility = 'shared' OR author_user_id = auth.uid()));

DROP POLICY IF EXISTS "Owners and collaborators can comment on insights" ON public.insight_comments;
CREATE POLICY "Owners and collaborators can comment on insights"
ON public.insight_comments FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND public.insight_belongs_to_episode(insight_type, insight_id, episode_id)
  AND (
    (public.is_episode_owner(episode_id, auth.uid()) AND public.user_has_boardroom_plan(auth.uid()))
    OR public.user_can_view_episode(episode_id, auth.uid())
    OR public.can_user_view_invited_episode(episode_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Authors can edit their comments" ON public.insight_comments;
CREATE POLICY "Authors can edit their comments"
ON public.insight_comments FOR UPDATE TO authenticated
USING (author_user_id = auth.uid())
WITH CHECK (author_user_id = auth.uid());

DROP POLICY IF EXISTS "Authors and episode owners can delete comments" ON public.insight_comments;
CREATE POLICY "Authors and episode owners can delete comments"
ON public.insight_comments FOR DELETE TO authenticated
USING (author_user_id = auth.uid() OR public.is_episode_owner(episode_id, auth.uid()));

DROP POLICY IF EXISTS "Mentions are visible with the parent comment" ON public.insight_comment_mentions;
CREATE POLICY "Mentions are visible with the parent comment"
ON public.insight_comment_mentions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.insight_comments c
    WHERE c.id = insight_comment_mentions.comment_id
      AND public.user_can_access_episode(c.episode_id, auth.uid())
      AND (c.visibility = 'shared' OR c.author_user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Comment authors can mention users with access" ON public.insight_comment_mentions;
CREATE POLICY "Comment authors can mention users with access"
ON public.insight_comment_mentions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.insight_comments c
    WHERE c.id = insight_comment_mentions.comment_id
      AND c.author_user_id = auth.uid()
      AND public.user_can_access_episode(c.episode_id, insight_comment_mentions.mentioned_user_id)
  )
);

DROP POLICY IF EXISTS "Comment authors can remove mentions" ON public.insight_comment_mentions;
CREATE POLICY "Comment authors can remove mentions"
ON public.insight_comment_mentions FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.insight_comments c
    WHERE c.id = insight_comment_mentions.comment_id
      AND c.author_user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.list_episode_collaborators(p_episode_id uuid)
RETURNS TABLE (user_id uuid, email text, is_owner boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_can_access_episode(p_episode_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (u.id) u.id, u.email::text, (e.analyzed_by = u.id) AS is_owner
  FROM (
    SELECT ep.analyzed_by AS uid FROM public.episodes ep
    WHERE ep.id = p_episode_id AND ep.analyzed_by IS NOT NULL
    UNION
    SELECT g.grantee_user_id FROM public.analysis_access_grants g WHERE g.episode_id = p_episode_id
    UNION
    SELECT m.user_id
    FROM public.episode_folder_assignments efa
    JOIN public.folder_members m ON m.folder_id = efa.folder_id
    WHERE efa.episode_id = p_episode_id
  ) members
  JOIN auth.users u ON u.id = members.uid
  JOIN public.episodes e ON e.id = p_episode_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_episode_collaborators(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_episode_collaborators(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.insight_comments TO authenticated;
GRANT ALL ON public.insight_comments TO service_role;
GRANT SELECT, INSERT, DELETE ON public.insight_comment_mentions TO authenticated;
GRANT ALL ON public.insight_comment_mentions TO service_role;