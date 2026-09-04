# Discovery setup checklist

Everything the Discover feature needs that lives **outside** this repository.
The code is complete without any of it — with zero optional keys the weekly job
still runs and fills each edition from the curated Inspiration Library — but each
step below widens or activates part of the experience.

Steps 1–2 are required. Step 3 is applied by migration and only needs verifying.
Steps 4–8 are optional and independent of each other.

**If you only do one optional step, configure a search provider** — step 4
(Exa) or step 5 (Brave). Without one, For You can never contain recent
material: it becomes a rotation of curated classics that runs out of unseen
items in a few weeks. Exa is the lowest-friction option; its free tier needs no
payment method.

---

## 1. Apply the migrations

| | |
|---|---|
| **Service** | Supabase (project `iffcuueutmsusgdfekvm`) |
| **Exact setting** | Run the two new migration files |
| **Value format** | `supabase db push`, or apply `supabase/migrations/20260817120000_add_discovery_recommendations.sql` then `20260817120100_seed_inspiration_library.sql` in that order |
| **Where it belongs** | The project database |
| **Why** | Creates `discovery_content`, `recommendation_batches`, `profile_recommendations`, `recommendation_events`, `profile_recommendation_contexts`, their RLS policies, and the seed library. Nothing in Discover works without them. |
| **How to validate** | `select count(*) from public.discovery_content where is_curated;` returns 25. Row count alone says nothing about *visibility*, so also check the rows are servable through RLS: `begin; set local role authenticated; set local request.jwt.claims = '{"sub":"<a-real-user-uuid>","role":"authenticated"}'; select count(*) from public.discovery_content; rollback;` must be non-zero. Then run `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/discovery_rls.sql` — it prints a `PASS` line per check and rolls back. |

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

## 3. Verify the weekly schedule

| | |
|---|---|
| **Service** | Supabase → Database → Extensions (`pg_cron`, `pg_net`) |
| **Exact setting** | Applied by migration `20260902110000_schedule_weekly_recommendations.sql` — nothing to do by hand |
| **Value format** | — |
| **Where it belongs** | The project database |
| **Why** | Generation must be asynchronous from page loads; batching means each tick processes at most `DISCOVERY_MAX_PROFILES_PER_RUN` profiles. |
| **How to validate** | `select jobname, schedule, active from cron.job;` lists `generate-weekly-recommendations` on `7 * * * 1`. After the first tick, `select week_key, status, item_count from public.recommendation_batches order by generated_at desc limit 5;` shows `ready` rows. |

The migration is idempotent and never overwrites an existing hand-made job. It
skips with a `RAISE NOTICE` if `pg_cron`/`pg_net` are not installed, so enable
those extensions first and re-run it if the job is missing.

The cron secret is resolved at fire time from Vault, falling back to a
database-level setting, so it never appears in the migration or in
`cron.job.command`. Store it once if you are using the fallback:

```sql
alter database postgres set app.cron_secret = 'the-same-value-as-CRON_SECRET';
```

`CRON_SECRET` must already be set as an Edge Function secret for
`send-daily-prompt`; the same value is reused here.

Manual fallback, if the migration's extension guard bailed and you would rather
not re-run it:

```sql
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

To drain a large backlog faster on the first run, temporarily use `'*/10 * * * 1'`.

## 4. Exa search provider (optional, recommended first)

| | |
|---|---|
| **Service** | Exa — https://dashboard.exa.ai |
| **Exact setting** | Edge Function secret `EXA_API_KEY` |
| **Value format** | The API key string from the dashboard, no prefix, no quotes |
| **Where it belongs** | Supabase → Project Settings → Edge Functions → Secrets |
| **Why** | Enables the `exa` provider, which serves both timely and evergreen intents. Free tier requires no payment method. |
| **How to validate** | Trigger a manual refresh from Discover, then `select generation_stats->'providers' from public.recommendation_batches order by generated_at desc limit 1;` — the array should include `exa`. |

Preferred over Brave where you only want one provider. Brave exposes coarse
freshness buckets (`pm`, `pw`) that only approximate the app's rule — the gap
between the two is what let an undated hit be treated as recent. Exa filters on
the real publication date, so it is handed exactly the same window
`is_daily_brief_content_fresh` enforces and the two cannot drift.

No page contents are requested (text, summaries and highlights each cost extra
per result), so cards from Exa carry a title, date, author and image but no
description. The per-item "why this" line is written separately from metadata.
Budget: capped at 6 searches per profile per run.

## 5. Brave search provider (optional)

| | |
|---|---|
| **Service** | Brave Search API — https://api-dashboard.search.brave.com |
| **Exact setting** | Edge Function secret `BRAVE_SEARCH_API_KEY` |
| **Value format** | The subscription token string from the dashboard (e.g. `BSA...`), no prefix, no quotes |
| **Where it belongs** | Supabase → Project Settings → Edge Functions → Secrets |
| **Why** | Enables the `brave_web` and `brave_news` providers. |
| **How to validate** | Trigger a manual refresh from Discover, then `select generation_stats from public.recommendation_batches order by generated_at desc limit 1;` — the `providers` array should include `brave_web`. |

Brave requires a card on file even for the free tier. Note that `freshness=pm`
is sent only for timely intents; evergreen queries are unconstrained and rely on
each hit carrying its own in-window date.

## 6. YouTube provider (optional)

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

## 7. Weekly notification (optional)

| | |
|---|---|
| **Service** | OneSignal (already configured for the daily prompt) |
| **Exact setting** | No new secret — `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` are reused |
| **Value format** | — |
| **Where it belongs** | Already in Edge Function secrets |
| **Why** | Sends one push per ready batch: "N recommendations for {Company} are ready." |
| **How to validate** | After a run, `select notified_at from public.recommendation_batches where status = 'ready';` is non-null. Users opt in through the dedicated `user_notification_prefs.weekly_briefing` toggle in Settings ("Weekly Founder Briefing"), separate from the daily prompt. |

Only one notification is ever sent per batch: `notified_at` is stamped whether
or not the send succeeded, and whether or not the user was opted in.

## 8. Analytics (optional, no config change)

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
The policies `"Admins insert/update/delete discovery content"` let anyone with
the existing `admin` role in `user_roles` curate them through the Supabase table
editor — no code change and no separate CMS. They are split by command on
purpose: a single `FOR ALL` policy is also a permissive `SELECT` policy and would
OR past the browse rule below.

`is_curated` also means **"this does not expire"**. Curated rows are served
regardless of `published_at`, which is what lets the library carry essays from
2004, and they are what the generator falls back to when live search is thin or
unconfigured. Discovered (non-curated) rows must carry a real publication date
inside `public.is_daily_brief_content_fresh`'s window to be shown at all. So a
genuinely timely item you want to expire normally should be added with
`is_curated = false`.

Useful columns: `active` (hide without deleting), `featured` and `priority`
(ordering), `categories` (the filter chips in Discover, values from
`DISCOVERY_CATEGORIES` in `src/lib/discovery.ts`).

`content_key` must be the normalized key for the URL — the value
`contentKey()` in `supabase/functions/_shared/discovery/url.ts` produces. For
`https://www.example.com/a-post/` that is `example.com/a-post`; for a YouTube
video it is `youtube:<videoId>`.
