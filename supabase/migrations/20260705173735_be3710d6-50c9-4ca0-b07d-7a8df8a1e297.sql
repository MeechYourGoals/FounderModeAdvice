
-- Storage RLS: users can only access files inside their own folder in source-uploads.
DROP POLICY IF EXISTS "Users can upload their own source files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own source files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own source files" ON storage.objects;

CREATE POLICY "Users can upload their own source files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'source-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own source files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'source-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own source files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'source-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Distinguish uploaded-document analyses from URL analyses.
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'url';
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS file_path text;

-- Rate limiting infrastructure (service-role only; edge functions call the function below).
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id uuid NOT NULL,
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, key, window_start)
);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role bypasses RLS and reaches this table.

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  _user_id uuid,
  _key text,
  _window interval,
  _limit integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket timestamptz := date_trunc('second', now()) - (extract(epoch from now())::bigint % extract(epoch from _window)::bigint) * interval '1 second';
  v_count integer;
BEGIN
  INSERT INTO public.rate_limits (user_id, key, window_start, count)
  VALUES (_user_id, _key, v_bucket, 1)
  ON CONFLICT (user_id, key, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;

  -- Best-effort cleanup of stale buckets for this key.
  DELETE FROM public.rate_limits
   WHERE user_id = _user_id AND key = _key AND window_start < v_bucket - _window;

  RETURN v_count <= _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, interval, integer) TO service_role;
