-- Store source transcripts for transcript-grounded video Q&A.
CREATE TABLE IF NOT EXISTS public.episode_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  transcript_text text NOT NULL,
  language text,
  source text DEFAULT 'youtube_captions',
  fetched_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (episode_id)
);

CREATE INDEX IF NOT EXISTS idx_episode_transcripts_episode_id
  ON public.episode_transcripts(episode_id);

ALTER TABLE public.episode_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transcripts for their own episodes"
ON public.episode_transcripts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.id = episode_transcripts.episode_id
      AND e.analyzed_by = auth.uid()
  )
);

-- Video-level chat sessions.
CREATE TABLE IF NOT EXISTS public.video_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_video_chat_sessions_user_id
  ON public.video_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_chat_sessions_video_id
  ON public.video_chat_sessions(video_id);
CREATE INDEX IF NOT EXISTS idx_video_chat_sessions_created_at
  ON public.video_chat_sessions(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_chat_sessions_user_video
  ON public.video_chat_sessions(user_id, video_id);

ALTER TABLE public.video_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own video chat sessions"
ON public.video_chat_sessions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create chat sessions for their own videos"
ON public.video_chat_sessions
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.id = video_chat_sessions.video_id
      AND e.analyzed_by = auth.uid()
  )
);

CREATE POLICY "Users can update their own video chat sessions"
ON public.video_chat_sessions
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own video chat sessions"
ON public.video_chat_sessions
FOR DELETE
USING (user_id = auth.uid());

CREATE TRIGGER update_video_chat_sessions_updated_at
BEFORE UPDATE ON public.video_chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Persist user and assistant messages for refresh-safe video chat.
CREATE TABLE IF NOT EXISTS public.video_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.video_chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_video_chat_messages_user_id
  ON public.video_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_video_chat_messages_video_id
  ON public.video_chat_messages(video_id);
CREATE INDEX IF NOT EXISTS idx_video_chat_messages_session_id
  ON public.video_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_video_chat_messages_created_at
  ON public.video_chat_messages(created_at);

ALTER TABLE public.video_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own video chat messages"
ON public.video_chat_messages
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own video chat messages"
ON public.video_chat_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.video_chat_sessions s
    WHERE s.id = video_chat_messages.session_id
      AND s.user_id = auth.uid()
      AND s.video_id = video_chat_messages.video_id
  )
  AND EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.id = video_chat_messages.video_id
      AND e.analyzed_by = auth.uid()
  )
);
