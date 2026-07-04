
## What I'll do in code

### 1. Apply the `user_subscriptions.status` migration
Confirmed via `information_schema`: the `status` column is **missing** in production (only 11 columns present). The file `supabase/migrations/20260704190000_add_user_subscriptions_status.sql` exists in the repo but was never executed against the DB. Every write from `payments-webhook`, `sync-revenuecat-subscription`, and `get_or_create_subscription()` is currently failing silently → paid users never upgrade.

I'll run the migration via the migration tool (idempotent `ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'`).

### 2. Redeploy the 4 edge functions
`payments-webhook`, `create-portal-session`, `send-daily-prompt`, `analyze-episode` — via `supabase--deploy_edge_functions`. Lovable's autodeploy usually handles this, but I'll force it to be safe.

### 3. Harden `analyze-episode` SSRF
The exposure is in `supabase/functions/_shared/transcript.ts`:
- Line 77: `fetch(current, { method: "HEAD", redirect: "follow" })` on caller-supplied URL
- Line 151: `fetch(url, ...)` on caller-supplied URL

Both are reachable from `analyze-episode`. Fix: add a shared `assertPublicUrl(url)` guard that runs before every user-URL fetch:
- Require `http:`/`https:` only (reject `file:`, `gopher:`, `ftp:`, etc.)
- Reject hostnames that are literal IPs
- DNS-resolve the hostname; reject if any resolved address is private/loopback/link-local/reserved (RFC1918, 127/8, 169.254/16, ::1, fc00::/7, fe80::/10, metadata 169.254.169.254)
- On redirect follow: re-check each hop (so we drop `redirect: "follow"` and implement a bounded manual follow that re-validates)

Applied at both fetch sites. No behavior change for legitimate public YouTube/podcast URLs.

## What only you can do (walkthroughs)

### A. `CRON_SECRET` for `send-daily-prompt`
The function now returns 401 unless the caller sends header `x-cron-secret: <value>` matching the `CRON_SECRET` env var. Until you set both sides, daily push is dead (which is fine pre-launch).

Steps:
1. **Backend → Edge Functions → Secrets** → add `CRON_SECRET` = a random 32+ char string. I can generate & store it for you via the generate_secret tool — say the word.
2. Update the scheduler that hits `/functions/v1/send-daily-prompt`:
   - **If pg_cron:** re-run the cron.schedule SQL with `headers` including `"x-cron-secret": "<same value>"` alongside the existing `apikey`/`Content-Type`. Because this SQL embeds a secret, do it in **Backend → SQL editor**, not a migration.
   - **If external cron (GitHub Actions, Cloudflare, EasyCron, etc.):** add the `x-cron-secret` header to the scheduled HTTP request; store the secret in that platform's secret store.

### B. Paddle live webhook URL + API key
1. **Paddle dashboard → Developer tools → Notifications** → the **live** endpoint's URL must end in `?env=live`. The handler now defaults to live if omitted, but explicit is the contract.
2. **Backend → Edge Functions → Secrets**: confirm `PADDLE_LIVE_API_KEY` is set (fetch_secrets shows only `PADDLE_LIVE_API_KEY` managed by connector — good). `create-portal-session` will 502 without it when a live Paddle customer opens the portal.

## Decisions I need from you

1. **Rate limits on `video-chat` and `parse-deck`.** The Lovable backend has no standard rate-limiting primitive. Options:
   - **(a)** Ad-hoc per-user cap in a new `public.rate_limits(user_id, key, window_start, count)` table with a security-definer function — ~30 lines, adds a DB row per call. Cheap but real.
   - **(b)** Skip until proper infra exists (documented gap).
   - Pick (a) or (b).

2. **PostHog identify email trait.** You said web analytics is out of scope, so I'm skipping it. Confirm you want it left alone.

3. **`CRON_SECRET`** — want me to generate & store it now, or will you pick the value?

## Out of scope this round
- Deleting `create-checkout-session` / `stripe-webhook` (needs your call on retiring Stripe entirely).
- Lint cleanup (114 pre-existing `no-explicit-any`).
- Landing page social proof.
- PWA maskable icon regeneration.
- 114 lint errors.

## Rollback
- Migration: `ALTER TABLE public.user_subscriptions DROP COLUMN IF EXISTS status;` (only if no row depends on it — it will after the webhook writes once).
- SSRF guard: single file (`supabase/functions/_shared/transcript.ts`); revert the file.
- Redeploy: previous versions remain in Supabase function history.
