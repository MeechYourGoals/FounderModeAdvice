-- Premium document upload: a private storage bucket for user-uploaded content
-- (documents/screenshots analyzed through the same pipeline as public URLs) plus
-- additive, backward-compatible columns to distinguish uploaded-document analyses
-- from URL analyses. Non-destructive: every existing episodes row defaults to 'url'.

-- Private bucket for premium content uploads (distinct from the pitch-deck bucket).
INSERT INTO storage.buckets (id, name, public) VALUES ('source-uploads', 'source-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access files inside their own folder (folder = user_id).
CREATE POLICY "Users can upload their own source files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'source-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own source files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'source-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own source files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'source-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Distinguish uploaded-document analyses from URL analyses. Backward-compatible:
-- 'url' for every existing row; new uploads persist 'document'.
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'url';

-- Optional provenance of the uploaded file. Nullable; today the raw file is deleted
-- after text extraction, so this stays null, but the column is reserved so a future
-- "keep original" option needs no further migration.
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS file_path text;
