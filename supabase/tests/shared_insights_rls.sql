-- RLS + authorization checks for the "Share an insight" tables/functions.
--
-- Run against a database that already has the migrations applied:
--
--   supabase start
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" \
--        -v ON_ERROR_STOP=1 -f supabase/tests/shared_insights_rls.sql
--
-- Everything runs inside a transaction that is rolled back at the end, so it
-- leaves no rows behind. Any failed assertion aborts with an error.

BEGIN;

SET LOCAL client_min_messages TO NOTICE;

CREATE TEMP TABLE ids (
  user_a uuid, user_b uuid,
  episode_url uuid, episode_doc uuid, episode_b uuid,
  lesson_url uuid, lesson_doc uuid, lesson_b uuid
) ON COMMIT DROP;
GRANT SELECT ON ids TO authenticated, anon;

DO $$
DECLARE
  v_user_a uuid := gen_random_uuid();
  v_user_b uuid := gen_random_uuid();
  v_ep_url uuid; v_ep_doc uuid; v_ep_b uuid;
  v_lesson_url uuid; v_lesson_doc uuid; v_lesson_b uuid;
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_user_a, 'authenticated', 'authenticated',
     'shared-insights-a@test.local', 'x', now(), now(), now(), '{"provider":"email"}', '{}'),
    ('00000000-0000-0000-0000-000000000000', v_user_b, 'authenticated', 'authenticated',
     'shared-insights-b@test.local', 'x', now(), now(), now(), '{"provider":"email"}', '{}');

  -- User A: one public-URL episode (shareable) and one uploaded-document
  -- episode (never shareable, even though A owns it).
  INSERT INTO public.episodes (title, url, source_type, analyzed_by)
  VALUES ('A public talk', 'https://example.com/talk', 'url', v_user_a)
  RETURNING id INTO v_ep_url;
  INSERT INTO public.episodes (title, url, source_type, analyzed_by)
  VALUES ('A private deck', 'https://example.com/upload-1', 'document', v_user_a)
  RETURNING id INTO v_ep_doc;
  -- User B: a public-URL episode A does not own.
  INSERT INTO public.episodes (title, url, source_type, analyzed_by)
  VALUES ('Someone else''s talk', 'https://example.com/other-talk', 'url', v_user_b)
  RETURNING id INTO v_ep_b;

  INSERT INTO public.lessons (episode_id, lesson_text)
  VALUES (v_ep_url, 'Ship the smaller thing faster.') RETURNING id INTO v_lesson_url;
  INSERT INTO public.lessons (episode_id, lesson_text)
  VALUES (v_ep_doc, 'A lesson from a private document.') RETURNING id INTO v_lesson_doc;
  INSERT INTO public.lessons (episode_id, lesson_text)
  VALUES (v_ep_b, 'A lesson from user B''s talk.') RETURNING id INTO v_lesson_b;

  INSERT INTO ids VALUES (v_user_a, v_user_b, v_ep_url, v_ep_doc, v_ep_b,
                          v_lesson_url, v_lesson_doc, v_lesson_b);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.become(_user uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', _user, 'role', 'authenticated')::text, true);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.become_anon() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{}', true);
END $$;

-- ---------------------------------------------------------------------------
-- 1. Owner can share a lesson from a public-URL episode they own.
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

DO $$
DECLARE v ids%ROWTYPE; v_slug text;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_a);

  INSERT INTO public.shared_insights (lesson_id, episode_id, quote_text, created_by)
  VALUES (v.lesson_url, v.episode_url, 'Ship the smaller thing faster.', v.user_a)
  RETURNING slug INTO v_slug;

  ASSERT v_slug IS NOT NULL AND length(v_slug) = 10, 'a 10-char slug must be generated';
  -- Stash the slug (transaction-scoped) so later steps can reuse it without
  -- needing table access under a role that can't read it.
  PERFORM set_config('pg_temp.test_slug', v_slug, false);
  RAISE NOTICE 'PASS  owner can share a lesson from a public-URL episode they own';
END $$;

-- ---------------------------------------------------------------------------
-- 2. Owner cannot share a lesson from an uploaded-document episode.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v ids%ROWTYPE; v_failed boolean := false;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_a);

  BEGIN
    INSERT INTO public.shared_insights (lesson_id, episode_id, quote_text, created_by)
    VALUES (v.lesson_doc, v.episode_doc, 'A lesson from a private document.', v.user_a);
  EXCEPTION WHEN insufficient_privilege OR others THEN
    v_failed := true;
  END;
  ASSERT v_failed, 'sharing a lesson from an uploaded document must be rejected';
  RAISE NOTICE 'PASS  a document-sourced lesson can never be shared';
END $$;

-- ---------------------------------------------------------------------------
-- 3. A user cannot share someone else's lesson.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v ids%ROWTYPE; v_failed boolean := false;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_a);

  BEGIN
    INSERT INTO public.shared_insights (lesson_id, episode_id, quote_text, created_by)
    VALUES (v.lesson_b, v.episode_b, 'A lesson from user B''s talk.', v.user_a);
  EXCEPTION WHEN insufficient_privilege OR others THEN
    v_failed := true;
  END;
  ASSERT v_failed, 'sharing a lesson on an episode you do not own must be rejected';
  RAISE NOTICE 'PASS  a user cannot share another user''s lesson';
END $$;

-- ---------------------------------------------------------------------------
-- 4. Owner-only table read: user B cannot see user A's shared_insights row.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v ids%ROWTYPE; n integer;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_b);

  SELECT count(*) INTO n FROM public.shared_insights WHERE lesson_id = v.lesson_url;
  ASSERT n = 0, 'a non-owner must not see another user''s shared_insights row via the table';
  RAISE NOTICE 'PASS  the shared_insights table itself is owner-only (no public SELECT policy)';
END $$;

-- ---------------------------------------------------------------------------
-- 5. Anon has no table-level access, but can read a non-revoked share via
-- get_shared_insight and record a view via record_shared_insight_view.
-- ---------------------------------------------------------------------------
RESET ROLE;
SET LOCAL ROLE anon;

DO $$
DECLARE v_slug text := current_setting('pg_temp.test_slug', true); n integer; r record;
BEGIN
  PERFORM pg_temp.become_anon();

  SELECT count(*) INTO n FROM public.shared_insights WHERE slug = v_slug;
  ASSERT n = 0, 'anon must not see any row via the shared_insights table directly';

  SELECT * INTO r FROM public.get_shared_insight(v_slug);
  ASSERT r.quote_text = 'Ship the smaller thing faster.', 'anon must read the share via get_shared_insight';
  ASSERT r.slug = v_slug, 'the returned row must match the requested slug';

  PERFORM public.record_shared_insight_view(v_slug);
  RAISE NOTICE 'PASS  anon has no table access but can read+view via the public RPCs';
END $$;

RESET ROLE;

DO $$
DECLARE v_slug text := current_setting('pg_temp.test_slug', true); n integer;
BEGIN
  SELECT view_count INTO n FROM public.shared_insights WHERE slug = v_slug;
  ASSERT n = 1, format('record_shared_insight_view must have incremented view_count, saw %s', n);
  RAISE NOTICE 'PASS  record_shared_insight_view increments the counter';
END $$;

-- ---------------------------------------------------------------------------
-- 6. Owner can revoke; a revoked share is no longer readable by anon.
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

DO $$
DECLARE v ids%ROWTYPE; v_slug text := current_setting('pg_temp.test_slug', true);
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_a);
  UPDATE public.shared_insights SET revoked_at = now() WHERE slug = v_slug;
  RAISE NOTICE 'PASS  owner can revoke their own share';
END $$;

RESET ROLE;
SET LOCAL ROLE anon;

DO $$
DECLARE v_slug text := current_setting('pg_temp.test_slug', true); n integer;
BEGIN
  PERFORM pg_temp.become_anon();
  SELECT count(*) INTO n FROM public.get_shared_insight(v_slug);
  ASSERT n = 0, 'a revoked share must not be readable via get_shared_insight';
  RAISE NOTICE 'PASS  a revoked share is no longer publicly readable';
END $$;

RESET ROLE;

ROLLBACK;
