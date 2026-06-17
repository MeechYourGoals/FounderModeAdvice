-- Folder role enum
DO $$ BEGIN
  CREATE TYPE public.folder_role AS ENUM ('viewer', 'editor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Owner helper
CREATE OR REPLACE FUNCTION public.is_folder_owner(_folder_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.episode_folders f WHERE f.id = _folder_id AND f.user_id = _user_id);
$$;
GRANT EXECUTE ON FUNCTION public.is_folder_owner(uuid, uuid) TO authenticated;

-- Paid-plan gate
CREATE OR REPLACE FUNCTION public.user_has_paid_plan(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions s
    WHERE s.user_id = _user_id AND s.tier IN ('seed', 'series_z')
  );
$$;
GRANT EXECUTE ON FUNCTION public.user_has_paid_plan(uuid) TO authenticated;

-- folder_members
CREATE TABLE public.folder_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.episode_folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.folder_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folder_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folder_members TO authenticated;
GRANT ALL ON public.folder_members TO service_role;
ALTER TABLE public.folder_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and members can view members"
ON public.folder_members FOR SELECT TO authenticated
USING (public.is_folder_owner(folder_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Owners can add members"
ON public.folder_members FOR INSERT TO authenticated
WITH CHECK (public.is_folder_owner(folder_id, auth.uid()) AND public.user_has_paid_plan(auth.uid()));

CREATE POLICY "Owners can remove members"
ON public.folder_members FOR DELETE TO authenticated
USING (public.is_folder_owner(folder_id, auth.uid()) OR user_id = auth.uid());

-- folder_invites
CREATE TABLE public.folder_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.episode_folders(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by_user_id uuid NOT NULL,
  accepted_by_user_id uuid,
  role public.folder_role NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'pending',
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folder_invites TO authenticated;
GRANT ALL ON public.folder_invites TO service_role;
ALTER TABLE public.folder_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view folder invites"
ON public.folder_invites FOR SELECT TO authenticated
USING (public.is_folder_owner(folder_id, auth.uid()));

CREATE POLICY "Owners can create folder invites"
ON public.folder_invites FOR INSERT TO authenticated
WITH CHECK (
  public.is_folder_owner(folder_id, auth.uid())
  AND invited_by_user_id = auth.uid()
  AND public.user_has_paid_plan(auth.uid())
);

CREATE POLICY "Owners can update folder invites"
ON public.folder_invites FOR UPDATE TO authenticated
USING (public.is_folder_owner(folder_id, auth.uid()))
WITH CHECK (public.is_folder_owner(folder_id, auth.uid()));

-- Let members see the folder via a shared-folder policy
CREATE POLICY "Members can view shared folders"
ON public.episode_folders FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.folder_members m WHERE m.folder_id = id AND m.user_id = auth.uid())
);

-- Accept invite RPC
CREATE OR REPLACE FUNCTION public.accept_folder_invite(p_token_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite public.folder_invites%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_invite FROM public.folder_invites WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF v_invite.status = 'revoked' THEN RAISE EXCEPTION 'Invite revoked'; END IF;
  IF v_invite.expires_at < now() THEN RAISE EXCEPTION 'Invite expired'; END IF;

  INSERT INTO public.folder_members (folder_id, user_id, role)
  VALUES (v_invite.folder_id, v_uid, v_invite.role)
  ON CONFLICT (folder_id, user_id) DO NOTHING;

  UPDATE public.folder_invites
  SET status = 'accepted', accepted_by_user_id = v_uid
  WHERE id = v_invite.id;

  RETURN v_invite.folder_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_folder_invite(text) TO authenticated;