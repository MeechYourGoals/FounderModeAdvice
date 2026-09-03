# Ship Discover: apply backend, schedule, verify

The Discover code is already in the workspace (`src/pages/Discover.tsx`, `supabase/functions/generate-recommendations/index.ts`, and both migration files). What is missing is the backend state: the current database has none of the five discovery tables, so `/discover` would show its error state today.

## What I will do

1. **Apply the two discovery migrations** in order:
   - `20260817120000_add_discovery_recommendations.sql` — creates `discovery_content`, `recommendation_batches`, `profile_recommendations`, `recommendation_events`, `profile_recommendation_contexts`, their grants/RLS policies, and the four helper functions.
   - `20260817120100_seed_inspiration_library.sql` — seeds the 25 curated library rows.
   Then confirm `select count(*) from discovery_content where is_curated` returns 25 and that RLS is enabled with policies on all five tables.

2. **Confirm the edge function is live.** `generate-recommendations` deploys automatically with the code, and `supabase/config.toml` already pins `verify_jwt = false` for it. I will call it to confirm it responds with the expected auth/entitlement rejection rather than a 404 or boot error.

3. **Prove tenant isolation.** `supabase/tests/discovery_rls.sql` needs a superuser psql session I don't have, so instead I will verify the same property directly against production: query `profile_recommendations` and `recommendation_batches` as two different authenticated users and confirm each sees only its own rows, plus assert there is no client `UPDATE` policy on `profile_recommendations` (state changes must go through `set_recommendation_state`). I will report the actual policy expressions so they are reviewable.

## What I cannot do and will hand back to you

- **The weekly cron job.** Secrets are write-only to me, so I can't read the existing `CRON_SECRET`. I'll give you the exact SQL to paste in the SQL editor (the `alter database ... set app.cron_secret` line plus the `cron.schedule` call from `docs/discovery-setup.md`), with `pg_cron`/`pg_net` enabled first.
- **Optional provider keys.** `YOUTUBE_API_KEY` is yours to add if you want web/news/video candidates. Without them the weekly job still runs and serves the curated library — `generation_stats.providers` returning only `["curated"]` is exactly that signal.

## Verification I will report back

- Row counts and policy list for the five new tables.
- Edge function reachability.
- Cross-user read isolation result.
- The `status` / `item_count` / `generation_stats` of any batch produced by a refresh, once a Boardroom account triggers one.

No existing table, policy, function, or secret is modified — both migrations are purely additive.
