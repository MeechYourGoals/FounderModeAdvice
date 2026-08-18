-- Smart tag folders (Boardroom): a rule ties a tag name to a folder so
-- matching analyses are filed automatically — existing rows on create, and
-- new analyses when tags are written.
--
-- Gating: INSERT/DELETE require user_has_boardroom_plan. SELECT is owner-only
-- so the library can show which folders are smart. The analyze-episode
-- function uses the service role and still checks the Boardroom RPC before
-- applying rules, so a downgrade stops future auto-filing.

CREATE TABLE IF NOT EXISTS public.episode_folder_tag_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.episode_folders (id) ON DELETE CASCADE,
  tag_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag_name)
);

CREATE INDEX IF NOT EXISTS episode_folder_tag_rules_user_id_idx
  ON public.episode_folder_tag_rules (user_id);
CREATE INDEX IF NOT EXISTS episode_folder_tag_rules_user_tag_idx
  ON public.episode_folder_tag_rules (user_id, tag_name);

ALTER TABLE public.episode_folder_tag_rules ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.episode_folder_tag_rules FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON public.episode_folder_tag_rules TO authenticated;
GRANT ALL ON public.episode_folder_tag_rules TO service_role;

CREATE POLICY "Users can view their folder tag rules"
  ON public.episode_folder_tag_rules
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Boardroom users can insert folder tag rules"
  ON public.episode_folder_tag_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.user_has_boardroom_plan(auth.uid())
  );

CREATE POLICY "Boardroom users can delete folder tag rules"
  ON public.episode_folder_tag_rules
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.user_has_boardroom_plan(auth.uid())
  );
