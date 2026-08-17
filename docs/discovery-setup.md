# Discovery setup checklist

Everything the Discover feature needs that lives **outside** this repository.
The code is complete without any of it — with zero optional keys the weekly job
still runs and serves the curated Inspiration Library — but each step below
widens or activates part of the experience.

Steps 1–3 are required. Steps 4–7 are optional and independent of each other.

---

## 1. Apply the migrations

| | |
|---|---|
| **Service** | Supabase (project `iffcuueutmsusgdfekvm`) |
| **Exact setting** | Run the two new migration files |
| **Value format** | `supabase db push`, or apply `supabase/migrations/20260817120000_add_discovery_recommendations.sql` then `20260817120100_seed_inspiration_library.sql` in that order |
| **Where it belongs** | The project database |
| **Why** | Creates `discovery_content`, `recommendation_batches`, `profile_recommendations`, `recommendation_events`, `profile_recommendation_contexts`, their RLS policies, and the seed library. Nothing in Discover works without them. |
| **How to validate** | `select count(*) from public.discovery_content where is_curated;` returns 25. Then run `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/discovery_rls.sql` — it prints a `PASS` line per check and rolls back. |

Rollback: both migrations are additive. To undo, `drop table` the five new
tables (cascade) and `drop function public.discovery_week_key(timestamptz),
public.owns_startup_profile(uuid,uuid), public.set_recommendation_state(uuid,text,uuid),
public.list_profiles_needing_recommendations(text,integer);`. No existing table
is altered, so nothing else is affected.

## 2. Deploy the edge function

| | |
|---|---|
| **Service** | Supabase Edge Functions |
| **Exact setting** | `supabase functions deploy generate-recommendations` |
| **Value format** | — |
| **Where it belongs** | The project's edge runtime |
| **Why** | Runs the weekly generation and the user-triggered refresh. |
| **How to validate** | `supabase functions list` shows `generate-recommendations`. `supabase/config.toml` already pins `verify_jwt = false` for it — the function does its own cron-secret, JWT, ownership, and tier checks. |

## 3. Schedule the weekly run

| | |
|---|---|
| **Service** | Supabase → Database → Extensions (`pg_cron`, `pg_net`) and SQL editor |
| **Exact setting** | A `cron.schedule` entry calling the function with the cron secret header |
| **Value format** | See SQL below |
| **Where it belongs** | The project database |
| **Why** | Generation must be asynchronous from page loads; batching means each tick processes at most `DISCOVERY_MAX_PROFILES_PER_RUN` profiles. |
| **How to validate** | `select * from cron.job;` lists the job. After the first tick, `select week_key, status, item_count from public.recommendation_batches order by generated_at desc limit 5;` shows `ready` rows. |

`CRON_SECRET` must already be set for `send-daily-prompt`; the same value is
reused here.

```sql
-- Hourly on Mondays: the first tick claims the week for the first 25 profiles,
-- later ticks drain the rest. Re-running is a no-op thanks to the
-- UNIQUE (profile_id, week_key) claim, so over-scheduling is safe.
select cron.schedule(
  'generate-weekly-recommendations',
  '7 * * * 1',
  $$
  select net.http_post(
    url     := 'https://iffcuueutmsusgdfekvm.supabase.co/functions/v1/generate-recommendations',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-cron-secret', current_setting('app.cron_secret', true)
               ),
    body    := '{}'::jsonb
  );
  $$
);
```

Store the secret once so it is not inlined in the job definition:

```sql
alter database postgres set app.cron_secret = 'the-same-value-as-CRON_SECRET';
```

To drain a large backlog faster on the first run, temporarily use `'*/10 * * * 1'`.

## 4. Web search provider (optional)

| | |
|---|---|
| **Service** | Brave Search API — https://api-dashboard.search.brave.com |
| **Exact setting** | Edge Function secret `BRAVE_SEARCH_API_KEY` |
| **Value format** | The subscription token string from the dashboard (e.g. `BSA...`), no prefix, no quotes |
| **Where it belongs** | Supabase → Project Settings → Edge Functions → Secrets |
| **Why** | Enables the `brave_web` and `brave_news` providers. Without it, candidates come only from the curated library. |
| **How to validate** | Trigger a manual refresh from Discover, then `select generation_stats from public.recommendation_batches order by generated_at desc limit 1;` — the `providers` array should include `brave_web`. |

## 5. YouTube provider (optional)

| | |
|---|---|
| **Service** | Google Cloud Console → APIs & Services |
| **Exact setting** | Enable **YouTube Data API v3**, create an API key, set it as Edge Function secret `YOUTUBE_API_KEY` |
| **Value format** | `AIza...` — an unrestricted **server** key (an HTTP-referrer restriction will reject calls from the edge runtime) |
| **Where it belongs** | Supabase → Project Settings → Edge Functions → Secrets |
| **Why** | Enables video recommendations with real durations and thumbnails. |
| **How to validate** | `generation_stats.providers` includes `youtube` after a run, and video cards show a duration. |

Quota note: a `search.list` call costs 100 units against the default 10,000/day
project quota, so the provider is capped at 3 searches per profile per run
(~30 profiles/day). Request a quota increase before scaling past that.

## 6. Weekly notification (optional)

| | |
|---|---|
| **Service** | OneSignal (already configured for the daily prompt) |
| **Exact setting** | No new secret — `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` are reused |
| **Value format** | — |
| **Where it belongs** | Already in Edge Function secrets |
| **Why** | Sends one push per ready batch: "N recommendations for {Company} are ready." |
| **How to validate** | After a run, `select notified_at from public.recommendation_batches where status = 'ready';` is non-null. Users opt in through the existing `user_notification_prefs.daily_prompt` toggle in Settings. |

Only one notification is ever sent per batch: `notified_at` is stamped whether
or not the send succeeded, and whether or not the user was opted in.

## 7. Analytics (optional, no config change)

PostHog events are emitted through the existing `src/services/analytics.ts`
provider, which is gated to installed-app runtimes. No new keys. Create funnels
on `discovery_viewed → recommendation_impression → recommendation_opened →
recommendation_analyze_clicked → recommendation_analysis_completed`.

---

## Entitlement mapping

No RevenueCat change is needed. Discovery reuses the existing Boardroom
entitlement: `public.user_has_boardroom_plan()` and
`user_subscriptions.tier = 'series_z'`, which the RevenueCat `Founder Mode
Advisor Pro` entitlement already maps to via
`sync-revenuecat-subscription`.

## Admin-curated library

Library rows are ordinary `discovery_content` rows with `is_curated = true`.
The RLS policy `"Admins manage discovery content"` lets anyone with the existing
`admin` role in `user_roles` insert, update, and deactivate them through the
Supabase table editor — no code change and no separate CMS.

Useful columns: `active` (hide without deleting), `featured` and `priority`
(ordering), `categories` (the filter chips in Discover, values from
`DISCOVERY_CATEGORIES` in `src/lib/discovery.ts`).

`content_key` must be the normalized key for the URL — the value
`contentKey()` in `supabase/functions/_shared/discovery/url.ts` produces. For
`https://www.example.com/a-post/` that is `example.com/a-post`; for a YouTube
video it is `youtube:<videoId>`.
