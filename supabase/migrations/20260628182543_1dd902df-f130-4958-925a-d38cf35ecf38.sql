DROP POLICY IF EXISTS "Users can view transcripts for their own episodes" ON public.episode_transcripts;
CREATE POLICY "Users can view transcripts for their own episodes"
ON public.episode_transcripts
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.episodes e WHERE e.id = episode_transcripts.episode_id AND e.analyzed_by = auth.uid()));