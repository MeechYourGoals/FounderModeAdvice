-- Insight-level collaboration: notes/comments and teammate mentions attached to
-- individual analysis insights (lessons, callouts, personalized insights).
--
-- Access model, mirroring the existing sharing layer:
--   * Anyone who can see an episode (owner, folder collaborator, or direct
--     analysis invitee) can read shared comments on its insights.
--   * Owners need the Boardroom plan to comment (collaboration is a premium
--     feature); invited collaborators may participate in comment threads on
--     content that was shared with them.
--   * "private" comments are personal notes — visible only to their author.
--   * Mentions may only target users who can already access the episode.

-- True when the user can access the episode by any supported path:
-- ownership, folder-based sharing, or a direct analysis invite.
CREATE OR REPLACE FUNCTION public.user_can_access_episode(_episode_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_episode_owner(_episode_id, _user_id)
      OR public.user_can_view_episode(_episode_id, _user_id)
      OR public.can_user_view_invited_episode(_episode_id, _user_id);
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_episode(uuid, uuid) TO authenticated;

-- Guards against comments being attached to an insight from a different
-- episode than the one they claim (which would leak them to the wrong
-- audience under the episode-scoped read policies).
CREATE OR REPLACE FUNCTION public.insight_belongs_to_episode(_insight_type text, _insight_id uuid, _episode_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _insight_type
    WHEN 'lesson' THEN EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = _insight_id AND l.episode_id = _episode_id
    )
    WHEN 'callout' THEN EXISTS (
      SELECT 1 FROM public.chavel_callouts c
      WHERE c.id = _insight_id AND c.episode_id = _episode_id
    )
    WHEN 'personalized_insight' THEN EXISTS (
      SELECT 1
      FROM public.personalized_insights pi
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
  insight_type text NOT NULL CHECK (insight_type IN ('lesson', 'callout', 'personalized_insight')),
  -- Insight rows are relational with stable uuid PKs (lessons / chavel_callouts /
  -- personalized_insights). No FK because the target table varies by type;
  -- integrity is enforced by insight_belongs_to_episode() in the INSERT policy,
  -- and orphans are removed with the episode via the episode_id cascade.
  insight_id uuid NOT NULL,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  -- 'shared' comments are visible to everyone with access to the episode;
  -- 'private' comments are personal notes visible only to the author.
  visibility text NOT NULL DEFAULT 'shared' CHECK (visibility IN ('shared', 'private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insight_comments_episode
  ON public.insight_comments (episode_id, created_at);
CREATE INDEX IF NOT EXISTS idx_insight_comments_insight
  ON public.insight_comments (insight_id, created_at);
CREATE INDEX IF NOT EXISTS idx_insight_comments_author
  ON public.insight_comments (author_user_id);

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

CREATE INDEX IF NOT EXISTS idx_insight_comment_mentions_user
  ON public.insight_comment_mentions (mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_insight_comment_mentions_comment
  ON public.insight_comment_mentions (comment_id);

ALTER TABLE public.insight_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_comment_mentions ENABLE ROW LEVEL SECURITY;

-- ---------- RLS: insight_comments ----------

DROP POLICY IF EXISTS "Users with episode access can view shared comments" ON public.insight_comments;
CREATE POLICY "Users with episode access can view shared comments"
ON public.insight_comments
FOR SELECT
TO authenticated
USING (
  public.user_can_access_episode(episode_id, auth.uid())
  AND (visibility = 'shared' OR author_user_id = auth.uid())
);

-- Owners must be on the Boardroom plan to start collaborating; invited
-- collaborators (folder members / analysis invitees) may join the thread on
-- content that a Boardroom owner shared with them.
DROP POLICY IF EXISTS "Owners and collaborators can comment on insights" ON public.insight_comments;
CREATE POLICY "Owners and collaborators can comment on insights"
ON public.insight_comments
FOR INSERT
TO authenticated
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
ON public.insight_comments
FOR UPDATE
TO authenticated
USING (author_user_id = auth.uid())
WITH CHECK (author_user_id = auth.uid());

-- Authors can delete their own comments; episode owners can moderate any
-- comment on their analyses.
DROP POLICY IF EXISTS "Authors and episode owners can delete comments" ON public.insight_comments;
CREATE POLICY "Authors and episode owners can delete comments"
ON public.insight_comments
FOR DELETE
TO authenticated
USING (
  author_user_id = auth.uid()
  OR public.is_episode_owner(episode_id, auth.uid())
);

-- ---------- RLS: insight_comment_mentions ----------

DROP POLICY IF EXISTS "Mentions are visible with the parent comment" ON public.insight_comment_mentions;
CREATE POLICY "Mentions are visible with the parent comment"
ON public.insight_comment_mentions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.insight_comments c
    WHERE c.id = insight_comment_mentions.comment_id
      AND public.user_can_access_episode(c.episode_id, auth.uid())
      AND (c.visibility = 'shared' OR c.author_user_id = auth.uid())
  )
);

-- Only the comment author may record mentions, and only of users who can
-- already access the episode (no mentioning strangers into private content).
DROP POLICY IF EXISTS "Comment authors can mention users with access" ON public.insight_comment_mentions;
CREATE POLICY "Comment authors can mention users with access"
ON public.insight_comment_mentions
FOR INSERT
TO authenticated
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
ON public.insight_comment_mentions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.insight_comments c
    WHERE c.id = insight_comment_mentions.comment_id
      AND c.author_user_id = auth.uid()
  )
);

-- ---------- Collaborator directory (mention autocomplete) ----------

-- Everyone with access to the episode: the owner, direct analysis invitees,
-- and members of any folder containing the episode. Only callable by users
-- who themselves have access. SECURITY DEFINER so it can resolve emails from
-- auth.users; only the email (used app-wide as the display handle for
-- invites) is exposed, and only to people already sharing the content.
CREATE OR REPLACE FUNCTION public.list_episode_collaborators(p_episode_id uuid)
RETURNS TABLE (user_id uuid, email text, is_owner boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_can_access_episode(p_episode_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (u.id) u.id, u.email::text, (e.analyzed_by = u.id) AS is_owner
  FROM (
    SELECT ep.analyzed_by AS uid
    FROM public.episodes ep
    WHERE ep.id = p_episode_id AND ep.analyzed_by IS NOT NULL
    UNION
    SELECT g.grantee_user_id
    FROM public.analysis_access_grants g
    WHERE g.episode_id = p_episode_id
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
