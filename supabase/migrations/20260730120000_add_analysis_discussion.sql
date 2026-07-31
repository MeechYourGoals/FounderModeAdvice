-- Episode-level discussion threads: one chat-style thread per analysis so the
-- owner and everyone it is shared with can discuss the analysis itself
-- (rather than a single insight, which insight_comments already covers).
--
-- Access model, mirroring insight_comments:
--   * Anyone who can access the episode (owner, folder collaborator, or direct
--     analysis invitee) can read the thread.
--   * Owners need the Boardroom plan to post (collaboration is a premium
--     feature); invited collaborators may reply on any plan.
--   * Authors edit their own messages; authors delete their own, and the
--     episode owner may moderate (delete) any message on their analyses.
--
-- Reuses existing helpers: user_can_access_episode, is_episode_owner,
-- user_has_boardroom_plan, user_can_view_episode,
-- can_user_view_invited_episode, update_updated_at_column.

CREATE TABLE IF NOT EXISTS public.analysis_discussion_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_discussion_messages_episode
  ON public.analysis_discussion_messages (episode_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_discussion_messages_author
  ON public.analysis_discussion_messages (author_user_id);

DROP TRIGGER IF EXISTS update_analysis_discussion_messages_updated_at ON public.analysis_discussion_messages;
CREATE TRIGGER update_analysis_discussion_messages_updated_at
  BEFORE UPDATE ON public.analysis_discussion_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS restricts which rows an UPDATE may touch, not which columns — without
-- this guard an author could retarget their own message to another episode's
-- thread. Identity columns are immutable; edits may change the body only.
CREATE OR REPLACE FUNCTION public.reject_discussion_message_identity_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.episode_id IS DISTINCT FROM OLD.episode_id
     OR NEW.author_user_id IS DISTINCT FROM OLD.author_user_id THEN
    RAISE EXCEPTION 'episode_id and author_user_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analysis_discussion_messages_identity_guard ON public.analysis_discussion_messages;
CREATE TRIGGER analysis_discussion_messages_identity_guard
  BEFORE UPDATE ON public.analysis_discussion_messages
  FOR EACH ROW EXECUTE FUNCTION public.reject_discussion_message_identity_change();

-- Per-user read cursors driving the unread indicator on Discussion buttons.
CREATE TABLE IF NOT EXISTS public.analysis_discussion_reads (
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (episode_id, user_id)
);

ALTER TABLE public.analysis_discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_discussion_reads ENABLE ROW LEVEL SECURITY;

-- ---------- RLS: analysis_discussion_messages ----------

DROP POLICY IF EXISTS "Users with episode access can view discussion" ON public.analysis_discussion_messages;
CREATE POLICY "Users with episode access can view discussion"
ON public.analysis_discussion_messages
FOR SELECT
TO authenticated
USING (public.user_can_access_episode(episode_id, auth.uid()));

-- Owners must be on the Boardroom plan to start a discussion; invited
-- collaborators (folder members / analysis invitees) may join the thread on
-- content that a Boardroom owner shared with them.
DROP POLICY IF EXISTS "Owners and collaborators can post to discussion" ON public.analysis_discussion_messages;
CREATE POLICY "Owners and collaborators can post to discussion"
ON public.analysis_discussion_messages
FOR INSERT
TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND (
    (public.is_episode_owner(episode_id, auth.uid()) AND public.user_has_boardroom_plan(auth.uid()))
    OR public.user_can_view_episode(episode_id, auth.uid())
    OR public.can_user_view_invited_episode(episode_id, auth.uid())
  )
);

-- Editing requires ongoing episode access, so a revoked collaborator cannot
-- keep rewriting their old messages. The identity-guard trigger above keeps
-- episode_id/author_user_id frozen regardless.
DROP POLICY IF EXISTS "Authors can edit their discussion messages" ON public.analysis_discussion_messages;
CREATE POLICY "Authors can edit their discussion messages"
ON public.analysis_discussion_messages
FOR UPDATE
TO authenticated
USING (
  author_user_id = auth.uid()
  AND public.user_can_access_episode(episode_id, auth.uid())
)
WITH CHECK (
  author_user_id = auth.uid()
  AND public.user_can_access_episode(episode_id, auth.uid())
);

-- Authors can delete their own messages; episode owners can moderate any
-- message on their analyses.
DROP POLICY IF EXISTS "Authors and episode owners can delete discussion messages" ON public.analysis_discussion_messages;
CREATE POLICY "Authors and episode owners can delete discussion messages"
ON public.analysis_discussion_messages
FOR DELETE
TO authenticated
USING (
  author_user_id = auth.uid()
  OR public.is_episode_owner(episode_id, auth.uid())
);

-- ---------- RLS: analysis_discussion_reads ----------
-- The client writes cursors with upsert(), which needs INSERT and UPDATE.

DROP POLICY IF EXISTS "Users can view their own read cursors" ON public.analysis_discussion_reads;
CREATE POLICY "Users can view their own read cursors"
ON public.analysis_discussion_reads
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own read cursors" ON public.analysis_discussion_reads;
CREATE POLICY "Users can create their own read cursors"
ON public.analysis_discussion_reads
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.user_can_access_episode(episode_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own read cursors" ON public.analysis_discussion_reads;
CREATE POLICY "Users can update their own read cursors"
ON public.analysis_discussion_reads
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND public.user_can_access_episode(episode_id, auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_discussion_messages TO authenticated;
GRANT ALL ON public.analysis_discussion_messages TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.analysis_discussion_reads TO authenticated;
GRANT ALL ON public.analysis_discussion_reads TO service_role;

-- ---------- Hardening: insight_comments (pre-existing table) ----------
-- The legacy UPDATE policy has the same shape as the hole fixed above: it
-- only checks authorship, so an author could retarget a comment's episode /
-- insight columns or keep editing after access was revoked. Freeze identity
-- columns and require ongoing episode access to edit.

CREATE OR REPLACE FUNCTION public.reject_insight_comment_identity_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.episode_id IS DISTINCT FROM OLD.episode_id
     OR NEW.insight_type IS DISTINCT FROM OLD.insight_type
     OR NEW.insight_id IS DISTINCT FROM OLD.insight_id
     OR NEW.author_user_id IS DISTINCT FROM OLD.author_user_id THEN
    RAISE EXCEPTION 'comment identity columns cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS insight_comments_identity_guard ON public.insight_comments;
CREATE TRIGGER insight_comments_identity_guard
  BEFORE UPDATE ON public.insight_comments
  FOR EACH ROW EXECUTE FUNCTION public.reject_insight_comment_identity_change();

DROP POLICY IF EXISTS "Authors can edit their comments" ON public.insight_comments;
CREATE POLICY "Authors can edit their comments"
ON public.insight_comments
FOR UPDATE
TO authenticated
USING (
  author_user_id = auth.uid()
  AND public.user_can_access_episode(episode_id, auth.uid())
)
WITH CHECK (
  author_user_id = auth.uid()
  AND public.user_can_access_episode(episode_id, auth.uid())
);
