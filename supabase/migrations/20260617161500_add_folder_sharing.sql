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

-- True when the user owns the folder (folders are owned by episode_folders.user_id).
CREATE OR REPLACE FUNCTION public.is_folder_owner(_folder_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.episode_folders f
    WHERE f.id = _folder_id AND f.user_id = _user_id
  );
$$;

-- True when the user is a collaborator on the folder.
CREATE OR REPLACE FUNCTION public.is_folder_member(_folder_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.folder_members m
    WHERE m.folder_id = _folder_id AND m.user_id = _user_id
  );
$$;

-- True when the episode is assigned to at least one folder the user can access
-- as a collaborator. Drives read access to shared episodes and their insights.
CREATE OR REPLACE FUNCTION public.user_can_view_episode(_episode_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.episode_folder_assignments efa
    JOIN public.folder_members m ON m.folder_id = efa.folder_id
    WHERE efa.episode_id = _episode_id
      AND m.user_id = _user_id
  );
$$;

-- True when the lesson belongs to an episode the user can view as a collaborator.
CREATE OR REPLACE FUNCTION public.user_can_view_lesson(_lesson_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    WHERE l.id = _lesson_id
      AND l.episode_id IS NOT NULL
      AND public.user_can_view_episode(l.episode_id, _user_id)
  );
$$;

-- ---------- RLS: folder_members ----------
DROP POLICY IF EXISTS "Owners and members can view membership" ON public.folder_members;
CREATE POLICY "Owners and members can view membership"
ON public.folder_members FOR SELECT TO authenticated
USING (public.is_folder_owner(folder_id, auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can add members" ON public.folder_members;
CREATE POLICY "Owners can add members"
ON public.folder_members FOR INSERT TO authenticated
WITH CHECK (public.is_folder_owner(folder_id, auth.uid()));

DROP POLICY IF EXISTS "Owners can remove members, members can leave" ON public.folder_members;
CREATE POLICY "Owners can remove members, members can leave"
ON public.folder_members FOR DELETE TO authenticated
USING (public.is_folder_owner(folder_id, auth.uid()) OR user_id = auth.uid());

-- ---------- RLS: folder_invites ----------
DROP POLICY IF EXISTS "Owners can view their folder invites" ON public.folder_invites;
CREATE POLICY "Owners can view their folder invites"
ON public.folder_invites FOR SELECT TO authenticated
USING (public.is_folder_owner(folder_id, auth.uid()));

DROP POLICY IF EXISTS "Owners can create folder invites" ON public.folder_invites;
CREATE POLICY "Owners can create folder invites"
ON public.folder_invites FOR INSERT TO authenticated
WITH CHECK (
  public.is_folder_owner(folder_id, auth.uid())
  AND invited_by_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Owners can update (revoke) folder invites" ON public.folder_invites;
CREATE POLICY "Owners can update (revoke) folder invites"
ON public.folder_invites FOR UPDATE TO authenticated
USING (public.is_folder_owner(folder_id, auth.uid()))
WITH CHECK (public.is_folder_owner(folder_id, auth.uid()));

-- ---------- RLS: additive read access for collaborators ----------

-- The shared folder itself.
DROP POLICY IF EXISTS "Members can view shared folders" ON public.episode_folders;
CREATE POLICY "Members can view shared folders"
ON public.episode_folders FOR SELECT TO authenticated
USING (public.is_folder_member(id, auth.uid()));

-- Which episodes live in the shared folder.
DROP POLICY IF EXISTS "Members can view shared folder assignments" ON public.episode_folder_assignments;
CREATE POLICY "Members can view shared folder assignments"
ON public.episode_folder_assignments FOR SELECT TO authenticated
USING (public.is_folder_member(folder_id, auth.uid()));

-- The episodes assigned to a shared folder.
DROP POLICY IF EXISTS "Members can view shared episodes" ON public.episodes;
CREATE POLICY "Members can view shared episodes"
ON public.episodes FOR SELECT TO authenticated
USING (public.user_can_view_episode(id, auth.uid()));

-- Lessons (the core insights) for shared episodes.
DROP POLICY IF EXISTS "Members can view shared lessons" ON public.lessons;
CREATE POLICY "Members can view shared lessons"
ON public.lessons FOR SELECT TO authenticated
USING (episode_id IS NOT NULL AND public.user_can_view_episode(episode_id, auth.uid()));

-- Personalized insights tied to shared lessons.
DROP POLICY IF EXISTS "Members can view shared personalized insights" ON public.personalized_insights;
CREATE POLICY "Members can view shared personalized insights"
ON public.personalized_insights FOR SELECT TO authenticated
USING (lesson_id IS NOT NULL AND public.user_can_view_lesson(lesson_id, auth.uid()));

-- Callouts for shared episodes (used by the detail/export views).
DROP POLICY IF EXISTS "Members can view shared callouts" ON public.chavel_callouts;
CREATE POLICY "Members can view shared callouts"
ON public.chavel_callouts FOR SELECT TO authenticated
USING (episode_id IS NOT NULL AND public.user_can_view_episode(episode_id, auth.uid()));

-- ---------- Accept-invite RPC ----------
-- Runs as definer so the invitee (who is not the owner and cannot read the
-- invite row under RLS) can redeem a valid token. The raw token never reaches
-- the database; the client passes the SHA-256 hash it computed from the link.
CREATE OR REPLACE FUNCTION public.accept_folder_invite(p_token_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found' USING errcode = 'P0002';
  END IF;

  IF v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'This invitation has been revoked' USING errcode = 'P0001';
  END IF;

  -- Only pending invites can lapse; an already-accepted collaborator keeps access.
  IF v_invite.status = 'expired'
     OR (v_invite.status = 'pending' AND v_invite.expires_at < now()) THEN
    UPDATE public.folder_invites SET status = 'expired'
    WHERE id = v_invite.id AND status <> 'expired';
    RAISE EXCEPTION 'This invitation has expired' USING errcode = 'P0001';
  END IF;

  -- Idempotent: re-accepting (or accepting an already-claimed link while signed
  -- in as the same collaborator) simply returns the folder again.
  INSERT INTO public.folder_members (folder_id, user_id, role, invited_by_user_id)
  VALUES (v_invite.folder_id, v_user, v_invite.role, v_invite.invited_by_user_id)
  ON CONFLICT (folder_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.folder_invites
  SET status = 'accepted',
      accepted_at = COALESCE(accepted_at, now()),
      accepted_by_user_id = COALESCE(accepted_by_user_id, v_user)
  WHERE id = v_invite.id;

  RETURN v_invite.folder_id;
END;
$$;

-- ---------- Grants ----------
GRANT SELECT, INSERT, DELETE ON public.folder_members TO authenticated;
GRANT ALL ON public.folder_members TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.folder_invites TO authenticated;
GRANT ALL ON public.folder_invites TO service_role;

GRANT EXECUTE ON FUNCTION public.is_folder_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_folder_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_episode(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_lesson(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_folder_invite(text) TO authenticated;
