-- Private bucket for premium user document uploads (PDF, TXT, MD) used as analysis sources.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('source-uploads', 'source-uploads', false, 20971520)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own source files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'source-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own source files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'source-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own source files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'source-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
