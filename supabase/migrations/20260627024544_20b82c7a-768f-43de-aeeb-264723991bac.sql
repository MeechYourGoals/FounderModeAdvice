
-- Fix broken shared-folder policy
DROP POLICY IF EXISTS "Members can view shared folders" ON public.episode_folders;
CREATE POLICY "Members can view shared folders"
ON public.episode_folders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.folder_members m
    WHERE m.folder_id = episode_folders.id AND m.user_id = auth.uid()
  )
);

-- Remove episode_id IS NULL leak on chavel_callouts
DROP POLICY IF EXISTS "Users read callouts for episodes they analyzed" ON public.chavel_callouts;
CREATE POLICY "Users read callouts for episodes they analyzed"
ON public.chavel_callouts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.id = chavel_callouts.episode_id AND e.analyzed_by = auth.uid()
  )
);

-- Revoke anon/public execute on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.accept_folder_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_folder_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_paid_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_folder_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_folder_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_paid_plan(uuid) TO authenticated;
