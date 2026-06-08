
-- companies: service_role update/delete
CREATE POLICY "Service role can update companies" ON public.companies FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can delete companies" ON public.companies FOR DELETE TO service_role USING (true);

-- podcasts: service_role update/delete
CREATE POLICY "Service role can update podcasts" ON public.podcasts FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can delete podcasts" ON public.podcasts FOR DELETE TO service_role USING (true);

-- episode_transcripts: explicit service_role write policies
CREATE POLICY "Service role can insert transcripts" ON public.episode_transcripts FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update transcripts" ON public.episode_transcripts FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can delete transcripts" ON public.episode_transcripts FOR DELETE TO service_role USING (true);

-- storage: startup-decks update policy mirroring insert
CREATE POLICY "Users can update their own startup decks"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'startup-decks' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'startup-decks' AND (auth.uid())::text = (storage.foldername(name))[1]);
