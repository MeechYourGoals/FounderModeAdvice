-- Pre-launch authorization regression suite.
-- Run against a disposable/local database after all migrations are applied:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f supabase/tests/prelaunch_security_guards.sql
--
-- The transaction is always rolled back.

BEGIN;
SET LOCAL client_min_messages TO NOTICE;

CREATE TEMP TABLE ids (
  user_a uuid,
  user_b uuid,
  user_c uuid,
  episode_a uuid,
  folder_a uuid,
  folder_invite uuid,
  analysis_invite uuid
) ON COMMIT DROP;
GRANT SELECT ON ids TO authenticated, anon;

DO $$
DECLARE
  v_user_a uuid := gen_random_uuid();
  v_user_b uuid := gen_random_uuid();
  v_user_c uuid := gen_random_uuid();
  v_episode uuid;
  v_folder uuid;
  v_folder_invite uuid;
  v_analysis_invite uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', v_user_a, 'authenticated', 'authenticated',
     'prelaunch-a@test.local', 'x', now(), now(), now(), '{"provider":"email"}', '{}'),
    ('00000000-0000-0000-0000-000000000000', v_user_b, 'authenticated', 'authenticated',
     'prelaunch-b@test.local', 'x', now(), now(), now(), '{"provider":"email"}', '{}'),
    ('00000000-0000-0000-0000-000000000000', v_user_c, 'authenticated', 'authenticated',
     'prelaunch-c@test.local', 'x', now(), now(), now(), '{"provider":"email"}', '{}');

  INSERT INTO public.user_subscriptions (user_id, tier)
  VALUES (v_user_a, 'series_z'), (v_user_b, 'free'), (v_user_c, 'free');
  INSERT INTO public.user_monthly_usage (user_id, month_year, analyses_count)
  VALUES
    (v_user_a, to_char(now(), 'YYYY-MM'), 2),
    (v_user_b, to_char(now(), 'YYYY-MM'), 1);

  INSERT INTO public.episodes (title, url, source_type, analyzed_by, custom_prompt, file_path)
  VALUES (
    'User A private analysis',
    'https://example.com/private-analysis',
    'url',
    v_user_a,
    'private prompt',
    v_user_a::text || '/private.pdf'
  ) RETURNING id INTO v_episode;

  INSERT INTO public.episode_folders (user_id, name)
  VALUES (v_user_a, 'Private folder') RETURNING id INTO v_folder;

  INSERT INTO public.folder_invites (
    folder_id, invited_email, invited_by_user_id, role, token_hash, expires_at
  ) VALUES (
    v_folder, 'prelaunch-b@test.local', v_user_a, 'viewer', 'folder-token-hash', now() + interval '1 day'
  ) RETURNING id INTO v_folder_invite;

  INSERT INTO public.analysis_invites (
    episode_id, invited_email, invited_by_user_id, role, token_hash, expires_at
  ) VALUES (
    v_episode, 'prelaunch-b@test.local', v_user_a, 'viewer', 'analysis-token-hash', now() + interval '1 day'
  ) RETURNING id INTO v_analysis_invite;

  INSERT INTO ids VALUES (
    v_user_a, v_user_b, v_user_c, v_episode, v_folder,
    v_folder_invite, v_analysis_invite
  );
END
$$;

CREATE OR REPLACE FUNCTION pg_temp.become(_user uuid, _email text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', _user, 'role', 'authenticated', 'email', _email)::text,
    true
  );
END
$$;

-- Guard 2: User B cannot read User A's private analysis or sensitive columns.
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v ids%ROWTYPE;
  row_count integer;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_b, 'prelaunch-b@test.local');
  SELECT count(*) INTO row_count FROM public.episodes WHERE id = v.episode_a;
  ASSERT row_count = 0, 'User B must not read User A private episode';
  RAISE NOTICE 'PASS  User B cannot read User A private episode';
END
$$;

-- Guard 3: users can read only their own entitlement rows and cannot write.
DO $$
DECLARE
  v ids%ROWTYPE;
  row_count integer;
  blocked boolean := false;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_b, 'prelaunch-b@test.local');

  SELECT count(*) INTO row_count
  FROM public.user_subscriptions WHERE user_id = v.user_a;
  ASSERT row_count = 0, 'User B must not read User A subscription';

  BEGIN
    UPDATE public.user_subscriptions SET tier = 'series_z' WHERE user_id = v.user_b;
  EXCEPTION WHEN OTHERS THEN
    blocked := true;
  END;
  ASSERT blocked, 'authenticated subscription UPDATE must be blocked';

  blocked := false;
  BEGIN
    UPDATE public.user_monthly_usage SET analyses_count = 0 WHERE user_id = v.user_b;
  EXCEPTION WHEN OTHERS THEN
    blocked := true;
  END;
  ASSERT blocked, 'authenticated usage UPDATE must be blocked';

  blocked := false;
  BEGIN
    INSERT INTO public.user_subscriptions (user_id, tier) VALUES (gen_random_uuid(), 'series_z');
  EXCEPTION WHEN OTHERS THEN
    blocked := true;
  END;
  ASSERT blocked, 'authenticated subscription INSERT must be blocked';
  RAISE NOTICE 'PASS  entitlement rows are self-readable and server-writable only';
END
$$;

-- Guard 4: the invited user can accept once; another user cannot reuse links.
DO $$
DECLARE
  v ids%ROWTYPE;
  returned_id uuid;
  row_count integer;
  blocked boolean := false;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_b, 'prelaunch-b@test.local');

  returned_id := public.accept_folder_invite('folder-token-hash');
  ASSERT returned_id = v.folder_a, 'folder invite must return the invited folder';
  returned_id := public.accept_analysis_invite('analysis-token-hash');
  ASSERT returned_id = v.episode_a, 'analysis invite must return the invited episode';

  -- Same-user retries are safe and idempotent.
  ASSERT public.accept_folder_invite('folder-token-hash') = v.folder_a;
  ASSERT public.accept_analysis_invite('analysis-token-hash') = v.episode_a;

  SELECT count(*) INTO row_count FROM public.episodes WHERE id = v.episode_a;
  ASSERT row_count = 1, 'accepted analysis invite must grant episode access';
  RAISE NOTICE 'PASS  invited user can accept and retry idempotently';

  PERFORM pg_temp.become(v.user_c, 'prelaunch-c@test.local');
  BEGIN
    PERFORM public.accept_folder_invite('folder-token-hash');
  EXCEPTION WHEN OTHERS THEN
    blocked := true;
  END;
  ASSERT blocked, 'a second user must not redeem an accepted folder invite';

  blocked := false;
  BEGIN
    PERFORM public.accept_analysis_invite('analysis-token-hash');
  EXCEPTION WHEN OTHERS THEN
    blocked := true;
  END;
  ASSERT blocked, 'a second user must not redeem an accepted analysis invite';
  RAISE NOTICE 'PASS  accepted invite links cannot be redeemed by another user';
END
$$;

-- Owners cannot mutate invite rows directly; the revoke RPC removes access.
DO $$
DECLARE
  v ids%ROWTYPE;
  blocked boolean := false;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_a, 'prelaunch-a@test.local');
  BEGIN
    UPDATE public.analysis_invites SET status = 'pending' WHERE id = v.analysis_invite;
  EXCEPTION WHEN OTHERS THEN
    blocked := true;
  END;
  ASSERT blocked, 'owners must not reset accepted invite rows directly';

  PERFORM public.revoke_folder_invite(v.folder_invite);
  PERFORM public.revoke_analysis_invite(v.analysis_invite);
  RAISE NOTICE 'PASS  owners revoke only through atomic RPCs';
END
$$;

-- Revocation removed both grants.
DO $$
DECLARE
  v ids%ROWTYPE;
  row_count integer;
BEGIN
  SELECT * INTO v FROM ids;
  PERFORM pg_temp.become(v.user_b, 'prelaunch-b@test.local');
  SELECT count(*) INTO row_count FROM public.episodes WHERE id = v.episode_a;
  ASSERT row_count = 0, 'revoking the analysis invite must remove episode access';
  SELECT count(*) INTO row_count FROM public.episode_folders WHERE id = v.folder_a;
  ASSERT row_count = 0, 'revoking the folder invite must remove folder access';
  RAISE NOTICE 'PASS  revocation removes prior access';
END
$$;

RESET ROLE;

-- No broad direct episode SELECT policy may survive the hardening migration.
DO $$
DECLARE
  broad_count integer;
BEGIN
  SELECT count(*) INTO broad_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'episodes'
    AND cmd = 'SELECT'
    AND (
      roles && ARRAY['public', 'anon']::name[]
      OR lower(regexp_replace(coalesce(qual, ''), '\s', '', 'g')) IN ('', 'true', '(true)')
    );
  ASSERT broad_count = 0, format('found %s broad episode SELECT policies', broad_count);
  RAISE NOTICE 'PASS  episodes has no public/anon/USING(true) SELECT policy';
END
$$;

ROLLBACK;
