-- Revoke PUBLIC execute on SECURITY DEFINER helpers so they can't be called by anon.
-- authenticated already has explicit GRANT EXECUTE from the previous migration.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.is_folder_owner(uuid, uuid)',
    'public.is_folder_member(uuid, uuid)',
    'public.user_can_view_episode(uuid, uuid)',
    'public.user_can_view_lesson(uuid, uuid)',
    'public.user_has_paid_plan(uuid)',
    'public.user_has_boardroom_plan(uuid)',
    'public.is_episode_owner(uuid, uuid)',
    'public.can_user_view_invited_episode(uuid, uuid)',
    'public.user_can_access_episode(uuid, uuid)',
    'public.insight_belongs_to_episode(text, uuid, uuid)',
    'public.accept_folder_invite(text)',
    'public.accept_analysis_invite(text)',
    'public.list_episode_collaborators(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;