-- RLS + authorization checks for the Community Library (community_lessons,
-- the widened discovery_content browse policy, user_privacy_prefs, and the
-- community_register_analysis / search_community functions).
--
-- Run against a database that already has the migrations applied:
--
--   supabase start
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" \
--        -v ON_ERROR_STOP=1 -f supabase/tests/community_rls.sql
--
-- Everything runs inside a transaction that is rolled back at the end, so it
-- leaves no rows behind. Any failed assertion aborts with an error.

BEGIN;

SET LOCAL client_min_messages TO NOTICE;

CREATE TEMP TABLE ids (
  user_a uuid, user_b uuid
) ON COMMIT DROP;
GRANT SELECT ON ids TO authenticated, anon;

DO $$
DECLARE
  v_user_a uuid := gen_random_uuid();
  v_user_b uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_user_a, 'authenticated', 'authenticated',
     'community-a@test.local', 'x', now(), now(), now(), '{"provider":"email"}', '{}'),
    ('00000000-0000-0000-0000-000000000000', v_user_b, 'authenticated', 'authenticated',
     'community-b@test.local', 'x', now(), now(), now(), '{"provider":"email"}', '{}');

  INSERT INTO ids VALUES (v_user_a, v_user_b);
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
-- 1. community_register_analysis: not callable by authenticated or anon,
-- callable by the unrestricted connection this script runs as (the same
-- privilege level the service-role edge function calls use).
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  PERFORM public.community_register_analysis(
    jsonb_build_object(
      'url', 'https://example.com/rls-test-article',
      'canonical_url', 'https://example.com/rls-test-article',
      'content_key', 'example.com/rls-test-article',
      'title', 'An RLS Test Article',
      'content_type', 'article',
      'categories', jsonb_build_array('Startups'),
      'topics', jsonb_build_array('Strategy')
    ),
    jsonb_build_array(
      jsonb_build_object(
        'lesson_text', 'Delegate one thing today.',
        'text_hash', 'rls-test-hash-1'
      )
    )
  );
  ASSERT (SELECT community_analysis_count FROM public.discovery_content
          WHERE content_key = 'example.com/rls-test-article') = 1,
    'community_register_analysis must create a community_analysis_count = 1 row';
  RAISE NOTICE 'PASS  community_register_analysis creates content + lesson rows';
END $$;

SET LOCAL ROLE authenticated;

DO $$
DECLARE v ids%ROWTYPE; v_failed boolean := false;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_a);
  BEGIN
    PERFORM public.community_register_analysis('{}'::jsonb, '[]'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN
    v_failed := true;
  END;
  ASSERT v_failed, 'authenticated must not be able to call community_register_analysis';
  RAISE NOTICE 'PASS  community_register_analysis is not callable by authenticated';
END $$;

RESET ROLE;
SET LOCAL ROLE anon;

DO $$
DECLARE v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become_anon();
  BEGIN
    PERFORM public.community_register_analysis('{}'::jsonb, '[]'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN
    v_failed := true;
  END;
  ASSERT v_failed, 'anon must not be able to call community_register_analysis';
  RAISE NOTICE 'PASS  community_register_analysis is not callable by anon';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. Browse policy: a community row (never fresh, never curated) is visible
-- to authenticated users purely because community_analysis_count > 0; a
-- lookalike row with a zero count is not.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  INSERT INTO public.discovery_content
    (url, canonical_url, content_key, title, is_curated, active, published_at, community_analysis_count)
  VALUES
    ('https://example.com/rls-test-stale-no-community', 'https://example.com/rls-test-stale-no-community',
     'example.com/rls-test-stale-no-community', 'Stale, uncurated, no community activity',
     false, true, now() - interval '400 days', 0);
END $$;

SET LOCAL ROLE authenticated;

DO $$
DECLARE v ids%ROWTYPE; n integer;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_a);

  SELECT count(*) INTO n FROM public.discovery_content WHERE content_key = 'example.com/rls-test-article';
  ASSERT n = 1, 'a community-analyzed (but stale, uncurated) row must be visible';

  SELECT count(*) INTO n FROM public.discovery_content
    WHERE content_key = 'example.com/rls-test-stale-no-community';
  ASSERT n = 0, 'a stale, uncurated row with zero community activity must stay hidden';

  RAISE NOTICE 'PASS  community_analysis_count > 0 makes a row servable on its own';
END $$;

-- ---------------------------------------------------------------------------
-- 3. community_lessons: readable for visible content, not writable by
-- authenticated (writes are service-role only, via the RPC above).
-- ---------------------------------------------------------------------------

DO $$
DECLARE v ids%ROWTYPE; n integer; v_content_id uuid; v_failed boolean := false;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_a);

  SELECT id INTO v_content_id FROM public.discovery_content WHERE content_key = 'example.com/rls-test-article';
  SELECT count(*) INTO n FROM public.community_lessons WHERE content_id = v_content_id;
  ASSERT n = 1, 'authenticated must be able to read the community lesson for a visible content row';

  BEGIN
    INSERT INTO public.community_lessons (content_id, lesson_text, text_hash)
    VALUES (v_content_id, 'A lesson inserted directly by a client.', 'rls-test-hash-2');
  EXCEPTION WHEN insufficient_privilege THEN
    v_failed := true;
  END;
  ASSERT v_failed, 'authenticated must not be able to insert into community_lessons directly';
  RAISE NOTICE 'PASS  community_lessons is read-only for authenticated';
END $$;

-- ---------------------------------------------------------------------------
-- 4. search_community: authenticated gets the community row back; anon is
-- refused (no EXECUTE grant).
-- ---------------------------------------------------------------------------

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.search_community('rls-test', 10, 0);
  ASSERT n = 1, 'search_community must find the community-registered article by title';
  RAISE NOTICE 'PASS  search_community finds a community row by query';
END $$;

RESET ROLE;
SET LOCAL ROLE anon;

DO $$
DECLARE v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become_anon();
  BEGIN
    PERFORM count(*) FROM public.search_community('', 10, 0);
  EXCEPTION WHEN insufficient_privilege THEN
    v_failed := true;
  END;
  ASSERT v_failed, 'anon must not be able to call search_community';
  RAISE NOTICE 'PASS  search_community is not callable by anon';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 5. user_privacy_prefs: owner-only read/write.
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;

DO $$
DECLARE v ids%ROWTYPE;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_a);
  INSERT INTO public.user_privacy_prefs (user_id, contribute_to_community) VALUES (v.user_a, false);
  RAISE NOTICE 'PASS  a user can set their own privacy prefs';
END $$;

DO $$
DECLARE v ids%ROWTYPE; n integer; v_failed boolean := false;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_b);

  SELECT count(*) INTO n FROM public.user_privacy_prefs WHERE user_id = v.user_a;
  ASSERT n = 0, 'a user must not see another user''s privacy prefs';

  BEGIN
    UPDATE public.user_privacy_prefs SET contribute_to_community = true WHERE user_id = v.user_a;
  EXCEPTION WHEN insufficient_privilege THEN
    v_failed := true;
  END;
  -- An UPDATE with a USING clause that matches zero rows simply affects zero
  -- rows rather than raising, so also confirm it truly made no change.
  SELECT count(*) INTO n FROM public.user_privacy_prefs WHERE user_id = v.user_a AND contribute_to_community = false;
  ASSERT n = 1, 'another user''s UPDATE must not have changed the owner''s row';
  RAISE NOTICE 'PASS  user_privacy_prefs is owner-only';
END $$;

RESET ROLE;

ROLLBACK;
