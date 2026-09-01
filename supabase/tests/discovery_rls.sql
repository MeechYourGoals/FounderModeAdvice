-- RLS + authorization checks for the discovery tables.
--
-- Run against a database that already has the migrations applied:
--
--   supabase start
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" \
--        -v ON_ERROR_STOP=1 -f supabase/tests/discovery_rls.sql
--
-- Everything runs inside a transaction that is rolled back at the end, so it
-- leaves no rows behind. Any failed assertion aborts with an error.

BEGIN;

SET LOCAL client_min_messages TO NOTICE;

-- ---------------------------------------------------------------------------
-- Fixtures (service-role context: RLS bypassed while we set the scene)
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE ids (
  user_a uuid, user_b uuid,
  profile_a1 uuid, profile_a2 uuid, profile_b1 uuid,
  batch_a1 uuid, batch_a2 uuid, batch_b1 uuid,
  content_1 uuid, content_hidden uuid, content_fresh uuid, content_stale uuid,
  rec_a1 uuid, rec_b1 uuid
) ON COMMIT DROP;

-- The assertions below read this fixture table while impersonating a user, so
-- the impersonated roles need to see it. Without this the suite aborts on
-- "permission denied for table ids" before reaching any real check.
GRANT SELECT ON ids TO authenticated, anon;

DO $$
DECLARE
  v_user_a uuid := gen_random_uuid();
  v_user_b uuid := gen_random_uuid();
  v_p_a1 uuid; v_p_a2 uuid; v_p_b1 uuid;
  v_b_a1 uuid; v_b_a2 uuid; v_b_b1 uuid;
  v_c1 uuid; v_c_hidden uuid; v_c_fresh uuid; v_c_stale uuid;
  v_r_a1 uuid; v_r_b1 uuid;
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_user_a, 'authenticated', 'authenticated',
     'discovery-a@test.local', 'x', now(), now(), now(), '{"provider":"email"}', '{}'),
    ('00000000-0000-0000-0000-000000000000', v_user_b, 'authenticated', 'authenticated',
     'discovery-b@test.local', 'x', now(), now(), now(), '{"provider":"email"}', '{}');

  -- Only user A is on the Boardroom plan.
  INSERT INTO public.user_subscriptions (user_id, tier) VALUES (v_user_a, 'series_z');
  INSERT INTO public.user_subscriptions (user_id, tier) VALUES (v_user_b, 'free');

  INSERT INTO public.user_startup_profiles (user_id, company_name, description, stage)
  VALUES (v_user_a, 'Astra Launch Systems', 'Reusable launch vehicles.', 'series_a')
  RETURNING id INTO v_p_a1;
  INSERT INTO public.user_startup_profiles (user_id, company_name, description, stage)
  VALUES (v_user_a, 'Streakly', 'Consumer fitness app.', 'seed')
  RETURNING id INTO v_p_a2;
  INSERT INTO public.user_startup_profiles (user_id, company_name, description, stage)
  VALUES (v_user_b, 'Other Co', 'Something else.', 'seed')
  RETURNING id INTO v_p_b1;

  -- Deliberately ancient: a curated row is editorial and must stay servable
  -- regardless of age. Dating it in 2004 is the regression guard for the bug
  -- where a 30-day rule applied to the whole table emptied the library.
  INSERT INTO public.discovery_content (url, canonical_url, content_key, title, is_curated, active, published_at)
  VALUES ('https://example.com/a', 'https://example.com/a', 'example.com/a', 'A curated item', true, true,
          '2004-05-01'::timestamptz)
  RETURNING id INTO v_c1;
  INSERT INTO public.discovery_content (url, canonical_url, content_key, title, is_curated, active, published_at)
  VALUES ('https://example.com/hidden', 'https://example.com/hidden', 'example.com/hidden',
          'A deactivated item', true, false, now() - interval '2 days')
  RETURNING id INTO v_c_hidden;
  -- A discovered (non-curated) pair: recency still decides for these.
  INSERT INTO public.discovery_content (url, canonical_url, content_key, title, is_curated, active, published_at)
  VALUES ('https://example.com/fresh', 'https://example.com/fresh', 'example.com/fresh',
          'A recently discovered item', false, true, now() - interval '3 days')
  RETURNING id INTO v_c_fresh;
  INSERT INTO public.discovery_content (url, canonical_url, content_key, title, is_curated, active, published_at)
  VALUES ('https://example.com/stale', 'https://example.com/stale', 'example.com/stale',
          'A long-stale discovered item', false, true, now() - interval '400 days')
  RETURNING id INTO v_c_stale;

  INSERT INTO public.recommendation_batches (user_id, profile_id, week_key, status, item_count)
  VALUES (v_user_a, v_p_a1, '2026-W34', 'ready', 1) RETURNING id INTO v_b_a1;
  INSERT INTO public.recommendation_batches (user_id, profile_id, week_key, status, item_count)
  VALUES (v_user_a, v_p_a2, '2026-W34', 'ready', 1) RETURNING id INTO v_b_a2;
  INSERT INTO public.recommendation_batches (user_id, profile_id, week_key, status, item_count)
  VALUES (v_user_b, v_p_b1, '2026-W34', 'ready', 1) RETURNING id INTO v_b_b1;

  INSERT INTO public.profile_recommendations (batch_id, user_id, profile_id, content_id, position, reason)
  VALUES (v_b_a1, v_user_a, v_p_a1, v_c1, 0, 'Because rockets.') RETURNING id INTO v_r_a1;
  INSERT INTO public.profile_recommendations (batch_id, user_id, profile_id, content_id, position, reason)
  VALUES (v_b_b1, v_user_b, v_p_b1, v_c1, 0, 'Because something else.') RETURNING id INTO v_r_b1;

  INSERT INTO ids VALUES (v_user_a, v_user_b, v_p_a1, v_p_a2, v_p_b1,
                          v_b_a1, v_b_a2, v_b_b1, v_c1, v_c_hidden, v_c_fresh, v_c_stale,
                          v_r_a1, v_r_b1);
END $$;

-- Helper: adopt a user's identity for RLS purposes.
CREATE OR REPLACE FUNCTION pg_temp.become(_user uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', _user, 'role', 'authenticated')::text, true);
END $$;

-- ---------------------------------------------------------------------------
-- 1. Idempotency: the same profile/week can never produce two editions
-- ---------------------------------------------------------------------------
DO $$
DECLARE v ids%ROWTYPE; v_failed boolean := false;
BEGIN
  SELECT * INTO v FROM ids;
  BEGIN
    INSERT INTO public.recommendation_batches (user_id, profile_id, week_key)
    VALUES (v.user_a, v.profile_a1, '2026-W34');
  EXCEPTION WHEN unique_violation THEN
    v_failed := true;
  END;
  ASSERT v_failed, 'duplicate (profile_id, week_key) must be rejected';
  RAISE NOTICE 'PASS  weekly generation is idempotent per profile';
END $$;

-- ---------------------------------------------------------------------------
-- 2. Owner reads: user A sees both of their profiles' feeds, and they differ
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

DO $$
DECLARE v ids%ROWTYPE; n integer;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_a);

  SELECT count(*) INTO n FROM public.recommendation_batches;
  ASSERT n = 2, format('user A should see exactly their 2 batches, saw %s', n);

  SELECT count(*) INTO n FROM public.profile_recommendations WHERE profile_id = v.profile_a1;
  ASSERT n = 1, format('user A should see their rocket recommendation, saw %s', n);

  SELECT count(*) INTO n FROM public.profile_recommendations WHERE profile_id = v.profile_a2;
  ASSERT n = 0, 'the fitness profile has its own (empty) feed, not the rocket one';

  RAISE NOTICE 'PASS  owner reads their own per-profile feeds';
END $$;

-- ---------------------------------------------------------------------------
-- 3. Cross-user isolation: user B sees none of user A's data
-- ---------------------------------------------------------------------------
DO $$
DECLARE v ids%ROWTYPE; n integer;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_b);

  SELECT count(*) INTO n FROM public.recommendation_batches WHERE user_id = v.user_a;
  ASSERT n = 0, format('user B must not read user A batches, saw %s', n);

  SELECT count(*) INTO n FROM public.profile_recommendations WHERE user_id = v.user_a;
  ASSERT n = 0, format('user B must not read user A recommendations, saw %s', n);

  SELECT count(*) INTO n FROM public.profile_recommendations WHERE id = v.rec_a1;
  ASSERT n = 0, 'user B must not read a specific user A recommendation by id';

  SELECT count(*) INTO n FROM public.recommendation_events WHERE user_id = v.user_a;
  ASSERT n = 0, 'user B must not read user A behavioral events';

  SELECT count(*) INTO n FROM public.profile_recommendation_contexts WHERE user_id = v.user_a;
  ASSERT n = 0, 'user B must not read user A recommendation context';

  RAISE NOTICE 'PASS  user B cannot read user A recommendations or events';
END $$;

-- ---------------------------------------------------------------------------
-- 4. State changes are owner-only, and only through the RPC
-- ---------------------------------------------------------------------------
DO $$
DECLARE v ids%ROWTYPE; v_state text; v_blocked boolean := false;
BEGIN
  SELECT * INTO v FROM ids;

  -- Owner: the RPC works.
  PERFORM pg_temp.become(v.user_a);
  PERFORM public.set_recommendation_state(v.rec_a1, 'saved');
  SELECT state INTO v_state FROM public.profile_recommendations WHERE id = v.rec_a1;
  ASSERT v_state = 'saved', format('owner save failed, state is %s', v_state);

  -- Non-owner: the RPC refuses to touch someone else's row.
  PERFORM pg_temp.become(v.user_b);
  BEGIN
    PERFORM public.set_recommendation_state(v.rec_a1, 'dismissed');
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  ASSERT v_blocked, 'user B must not change the state of user A recommendations';
END $$;

-- The RPC is SECURITY DEFINER, so verify from a service-role view that user B's
-- attempt above left no trace.
RESET ROLE;
DO $$
DECLARE v ids%ROWTYPE; v_state text;
BEGIN
  SELECT * INTO v FROM ids;
  SELECT state INTO v_state FROM public.profile_recommendations WHERE id = v.rec_a1;
  ASSERT v_state = 'saved', format('state was tampered with, now %s', v_state);
  RAISE NOTICE 'PASS  recommendation state changes are owner-only';
END $$;

-- ---------------------------------------------------------------------------
-- 5. No direct client UPDATE path (score/reason/position stay server-owned)
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
DO $$
DECLARE v ids%ROWTYPE; n integer := 0; v_blocked boolean := false;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_a);
  BEGIN
    -- 999, not 9999: score is numeric(6,3), and an out-of-range constant is
    -- coerced before any row is examined, so the statement used to abort with a
    -- numeric overflow and this assertion never ran at all.
    UPDATE public.profile_recommendations SET score = 999, reason = 'tampered' WHERE id = v.rec_a1;
    GET DIAGNOSTICS n = ROW_COUNT;
  EXCEPTION WHEN insufficient_privilege THEN
    -- Stronger than a missing policy: authenticated holds no UPDATE grant at
    -- all, so the statement is refused outright. Either outcome satisfies the
    -- property under test.
    v_blocked := true;
  END;
  ASSERT v_blocked OR n = 0, 'clients must not be able to UPDATE profile_recommendations';
  RAISE NOTICE 'PASS  clients cannot rewrite scores or reasons directly';
END $$;

-- ---------------------------------------------------------------------------
-- 6. Events: a user may log their own, but not against someone else's rows
-- ---------------------------------------------------------------------------
DO $$
DECLARE v ids%ROWTYPE; v_blocked boolean := false;
BEGIN
  SELECT * INTO v FROM ids;

  PERFORM pg_temp.become(v.user_a);
  INSERT INTO public.recommendation_events (user_id, profile_id, recommendation_id, content_id, event_type)
  VALUES (v.user_a, v.profile_a1, v.rec_a1, v.content_1, 'impression');

  PERFORM pg_temp.become(v.user_b);
  BEGIN
    INSERT INTO public.recommendation_events (user_id, profile_id, recommendation_id, content_id, event_type)
    VALUES (v.user_b, v.profile_a1, v.rec_a1, v.content_1, 'impression');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    v_blocked := true;
  END;
  ASSERT v_blocked, 'user B must not log events against user A recommendations';

  v_blocked := false;
  BEGIN
    INSERT INTO public.recommendation_events (user_id, event_type)
    VALUES (v.user_a, 'impression'); -- impersonating user A
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    v_blocked := true;
  END;
  ASSERT v_blocked, 'a user must not log events as another user';

  RAISE NOTICE 'PASS  behavioral events cannot be forged across users';
END $$;

-- ---------------------------------------------------------------------------
-- 7. Inspiration Library: readable by all, writable only by admins
-- ---------------------------------------------------------------------------
DO $$
DECLARE v ids%ROWTYPE; n integer; v_blocked boolean := false;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_b); -- free tier

  SELECT count(*) INTO n FROM public.discovery_content WHERE id = v.content_1;
  ASSERT n = 1, 'any signed-in user may browse the active library, however old the item is';

  SELECT count(*) INTO n FROM public.discovery_content WHERE id = v.content_hidden;
  ASSERT n = 0, 'deactivated library items must be hidden';

  SELECT count(*) INTO n FROM public.discovery_content WHERE id = v.content_fresh;
  ASSERT n = 1, 'a recently discovered item is servable';

  SELECT count(*) INTO n FROM public.discovery_content WHERE id = v.content_stale;
  ASSERT n = 0, 'a stale discovered item must stay hidden — recency still applies off the library';

  BEGIN
    INSERT INTO public.discovery_content (url, canonical_url, content_key, title)
    VALUES ('https://spam.example', 'https://spam.example', 'spam.example', 'Injected by a user');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    v_blocked := true;
  END;
  ASSERT v_blocked, 'non-admins must not write to the shared library';

  RAISE NOTICE 'PASS  library reads are open, recency applies only off the library, writes are admin-only';
END $$;

-- ---------------------------------------------------------------------------
-- 7b. An admin can curate. The freshness migration dropped the admin write
--     policy with no replacement, leaving the documented table-editor
--     workflow silently broken.
-- ---------------------------------------------------------------------------
RESET ROLE; -- the fixture write below is a service-role setup step
DO $$
DECLARE v ids%ROWTYPE; n integer;
BEGIN
  SELECT * INTO v FROM ids;
  INSERT INTO public.user_roles (user_id, role) VALUES (v.user_b, 'admin')
    ON CONFLICT DO NOTHING;

  PERFORM pg_temp.become(v.user_b);

  INSERT INTO public.discovery_content (url, canonical_url, content_key, title, is_curated, active, published_at)
  VALUES ('https://example.com/admin-added', 'https://example.com/admin-added', 'example.com/admin-added',
          'An admin-curated addition', true, true, '2011-03-01'::timestamptz);

  UPDATE public.discovery_content SET priority = 42 WHERE content_key = 'example.com/admin-added';
  SELECT count(*) INTO n FROM public.discovery_content
   WHERE content_key = 'example.com/admin-added' AND priority = 42;
  ASSERT n = 1, 'an admin may insert and update library rows';

  DELETE FROM public.discovery_content WHERE content_key = 'example.com/admin-added';

  RAISE NOTICE 'PASS  admins can curate the library';
END $$;

RESET ROLE;
DO $$ BEGIN
  DELETE FROM public.user_roles WHERE user_id = (SELECT user_b FROM ids) AND role = 'admin';
END $$;
-- Hand the session back exactly as section 5 left it: the checks below rely on
-- running as `authenticated` (pg_temp.become only swaps the JWT claims).
SET LOCAL ROLE authenticated;

-- ---------------------------------------------------------------------------
-- 8. The scheduler RPC is service-role only, and picks only eligible profiles
-- ---------------------------------------------------------------------------
DO $$
DECLARE v ids%ROWTYPE; v_blocked boolean := false;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_a);
  BEGIN
    PERFORM public.list_profiles_needing_recommendations('2026-W35', 10);
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  ASSERT v_blocked, 'authenticated users must not run the scheduler RPC';
  RAISE NOTICE 'PASS  scheduler RPC is service-role only';
END $$;

RESET ROLE;
DO $$
DECLARE v ids%ROWTYPE; n integer;
BEGIN
  SELECT * INTO v FROM ids;

  -- Current week: both of user A's profiles already have an edition.
  SELECT count(*) INTO n
  FROM public.list_profiles_needing_recommendations('2026-W34', 50)
  WHERE profile_id IN (v.profile_a1, v.profile_a2);
  ASSERT n = 0, format('profiles with this week''s edition must be skipped, got %s', n);

  -- Next week: both come back, and the free-tier user's profile never does.
  SELECT count(*) INTO n
  FROM public.list_profiles_needing_recommendations('2026-W35', 50)
  WHERE profile_id IN (v.profile_a1, v.profile_a2);
  ASSERT n = 2, format('both Boardroom profiles should be due next week, got %s', n);

  SELECT count(*) INTO n
  FROM public.list_profiles_needing_recommendations('2026-W35', 50)
  WHERE profile_id = v.profile_b1;
  ASSERT n = 0, 'a non-Boardroom profile must never be scheduled';

  RAISE NOTICE 'PASS  scheduler selects only eligible, not-yet-generated profiles';
END $$;

-- ---------------------------------------------------------------------------
-- 9. Deleting a profile cleans up everything hanging off it
-- ---------------------------------------------------------------------------
DO $$
DECLARE v ids%ROWTYPE; n integer;
BEGIN
  SELECT * INTO v FROM ids;
  DELETE FROM public.user_startup_profiles WHERE id = v.profile_a1;

  SELECT count(*) INTO n FROM public.recommendation_batches WHERE profile_id = v.profile_a1;
  ASSERT n = 0, 'batches must cascade with the profile';
  SELECT count(*) INTO n FROM public.profile_recommendations WHERE profile_id = v.profile_a1;
  ASSERT n = 0, 'recommendations must cascade with the profile';

  -- The shared catalog is not user data and must survive.
  SELECT count(*) INTO n FROM public.discovery_content WHERE id = v.content_1;
  ASSERT n = 1, 'shared library content must not be deleted with a profile';

  RAISE NOTICE 'PASS  deleting a profile cascades cleanly';
END $$;

-- ---------------------------------------------------------------------------
-- 10. The SQL and TypeScript week keys agree
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ASSERT public.discovery_week_key('2026-08-17T00:00:00Z'::timestamptz) = '2026-W34',
    'discovery_week_key disagrees with isoWeekKey() for 2026-08-17';
  ASSERT public.discovery_week_key('2027-01-01T12:00:00Z'::timestamptz) = '2026-W53',
    'discovery_week_key disagrees with isoWeekKey() across the year boundary';
  RAISE NOTICE 'PASS  SQL and TypeScript week keys agree';
END $$;

ROLLBACK;
