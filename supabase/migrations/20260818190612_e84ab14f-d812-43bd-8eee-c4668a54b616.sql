CREATE TABLE IF NOT EXISTS public.episode_folder_tag_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.episode_folders(id) ON DELETE CASCADE,
  tag_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_episode_folder_tag_rules_user_id
  ON public.episode_folder_tag_rules(user_id);

CREATE INDEX IF NOT EXISTS idx_episode_folder_tag_rules_user_tag
  ON public.episode_folder_tag_rules(user_id, tag_name);

REVOKE ALL ON public.episode_folder_tag_rules FROM PUBLIC;
REVOKE ALL ON public.episode_folder_tag_rules FROM anon;

GRANT SELECT, INSERT, DELETE ON public.episode_folder_tag_rules TO authenticated;
GRANT ALL ON public.episode_folder_tag_rules TO service_role;

ALTER TABLE public.episode_folder_tag_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tag rules" ON public.episode_folder_tag_rules
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Boardroom users can create tag rules" ON public.episode_folder_tag_rules
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND public.user_has_boardroom_plan(auth.uid())
  );

CREATE POLICY "Boardroom users can delete their own tag rules" ON public.episode_folder_tag_rules
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() AND public.user_has_boardroom_plan(auth.uid())
  );