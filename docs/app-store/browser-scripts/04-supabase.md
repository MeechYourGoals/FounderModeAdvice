# 4 — Supabase

**Start URL (log in first):** https://supabase.com/dashboard/project/iffcuueutmsusgdfekvm

**Run this after Apple Developer, RevenueCat, OneSignal, and PostHog** so the secrets exist. If you run it earlier, fill remaining secrets on a return visit.

**You are already signed in to this project.** Paste everything below the line into the browser agent.

Need from previous scripts (paste here):
APPLE_TEAM_ID, SERVICES_ID (com.foundermodeadvice.app.auth), SIWA_KEY_ID
RC_PUBLIC_IOS_SDK_KEY is NOT a Supabase secret (that goes to Expo).
I will type secret values myself: REVENUECAT_API_KEY, REVENUECAT_WEBHOOK_AUTH, ONESIGNAL_REST_API_KEY, POSTHOG_PERSONAL_API_KEY, Apple secret JWT, etc.

--- COPY FROM HERE ---

You are configuring the hosted Supabase project **iffcuueutmsusgdfekvm** for the Founder Mode Advice iOS launch. Work ONLY in this authenticated dashboard. Project URL is https://iffcuueutmsusgdfekvm.supabase.co

Ledger: DONE / BLOCKED / USER ACTION REQUIRED / FAILED. Never print service-role keys, secret API keys, webhook auth, Apple private keys, or user passwords. I type secrets into the UI. You verify names exist and values are set (masked).

**Pause for my OK before:** enabling/changing an auth provider; rotating keys; deleting users; deploying functions if a destructive option appears.

## Steps

### 1. Confirm project
Open https://supabase.com/dashboard/project/iffcuueutmsusgdfekvm
Confirm ref `iffcuueutmsusgdfekvm` and that this is Founder Mode Advice (not some other app). If the wrong project is selected, STOP.

### 2. Auth URL configuration
Open Authentication → URL Configuration
(https://supabase.com/dashboard/project/iffcuueutmsusgdfekvm/auth/url-configuration)

- Site URL: `https://foundermodeadvice.com`
- Additional Redirect URLs — ensure ALL of these exist (add missing, do not delete extras unless they are clearly hostile):
  - `https://foundermodeadvice.com/auth/callback`
  - `https://foundermodeadvice.com/**`
  - `http://localhost:8080/auth/callback`
  - `http://localhost:8080/**`
  - `com.foundermodeadvice.app://auth/callback`
  - `https://iffcuueutmsusgdfekvm.supabase.co/auth/v1/callback`

### 3. Sign in with Apple provider
Open Authentication → Providers → Apple
(https://supabase.com/dashboard/project/iffcuueutmsusgdfekvm/auth/providers)

Enable Apple.

Fields (names vary slightly by dashboard version):
- **Client IDs / Services ID / Authorized Client IDs** for the Apple **OAuth** provider:
  - `com.foundermodeadvice.app.auth,com.foundermodeadvice.app` (**Services ID first**, bundle second — order matters for Supabase web OAuth)
  - Native iOS sign-in uses `signInWithIdToken` with bundle `com.foundermodeadvice.app`.
- **Secret Key**: USER ACTION REQUIRED — I generate the Apple client secret JWT (from the Sign in with Apple .p8 + Team ID + Key ID + Services ID) and paste it. You do not generate or echo it. If the UI asks for Team ID + Key ID + .p8 instead, I fill those; you never upload the .p8 into chat.
- Save. Re-open and verify Apple is Enabled and Client IDs read exactly:
  `com.foundermodeadvice.app.auth,com.foundermodeadvice.app`

### 4. Edge Function secrets
Open Project Settings → Edge Functions → Secrets
(https://supabase.com/dashboard/project/iffcuueutmsusgdfekvm/settings/functions)

Check which of these **names** already exist (list names only, never values):

Required for iOS launch:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- LOVABLE_API_KEY
- SUPADATA_API_KEY
- REVENUECAT_API_KEY          (RevenueCat **secret** v1 key, not appl_)
- REVENUECAT_WEBHOOK_AUTH     (same random string as RevenueCat webhook Authorization header)
- ONESIGNAL_APP_ID
- ONESIGNAL_REST_API_KEY
- CRON_SECRET
- APP_URL = `https://foundermodeadvice.com`

Also set if missing (account deletion erases analytics/push when present):
- POSTHOG_HOST = `https://us.posthog.com` (private app/API host used by the PostHog REST API — not the `us.i.posthog.com` ingestion host)
- POSTHOG_PROJECT_ID
- POSTHOG_PERSONAL_API_KEY

Paddle (web billing, not iOS, but keep if already used):
- PADDLE_LIVE_API_KEY
- PAYMENTS_LIVE_WEBHOOK_SECRET
- PADDLE_SANDBOX_API_KEY
- PAYMENTS_SANDBOX_WEBHOOK_SECRET

For every missing required name: USER ACTION REQUIRED — I paste the value into the dashboard. You confirm the name now appears. For APP_URL, you may set `https://foundermodeadvice.com` if the UI lets you without a secret.

REVENUECAT_WEBHOOK_AUTH must be the **same literal string** as RevenueCat → Integrations → Webhooks → Authorization header.

### 5. Deploy functions
Open Edge Functions list:
https://supabase.com/dashboard/project/iffcuueutmsusgdfekvm/functions

Verify these functions exist:
- `revenuecat-webhook`
- `sync-revenuecat-subscription`
- `delete-user-account`
- `send-daily-prompt` (optional for push)

The latest `delete-user-account` must erase OneSignal + PostHog and tables `rate_limits` + `analysis_discussion_reads`. If the dashboard shows a “Deploy” from connected GitHub on the current main/release branch, pause for my OK then deploy:
- revenuecat-webhook
- sync-revenuecat-subscription
- delete-user-account

If there is no Deploy button, mark USER ACTION REQUIRED: I will run locally:
`supabase functions deploy revenuecat-webhook sync-revenuecat-subscription delete-user-account`

Record last-deployed time for each.

### 6. Auth email confirmation (reviewer demo)
Authentication → Providers → Email: note whether “Confirm email” is on. Reviewer demo account must be able to sign in without waiting on email. If confirm-email is ON, either I will confirm the demo user once, or we use a pre-confirmed user. Do not disable confirm-email globally without my OK.

### 7. Do not
Do not dump table data. Do not create a demo user with a password in chat (I create that myself on https://foundermodeadvice.com/auth). Do not expose the service role key.

## CAPTURE

```
SUPABASE_REF=iffcuueutmsusgdfekvm
SITE_URL=https://foundermodeadvice.com
REDIRECTS_OK=yes/no
APPLE_PROVIDER_ENABLED=yes/no
APPLE_CLIENT_IDS_INCLUDE_BUNDLE_AND_SERVICES=yes/no
SECRETS_PRESENT_NAMES=[list names only]
SECRETS_MISSING_NAMES=[list]
FUNCTIONS_DEPLOYED=revenuecat-webhook@…, sync-revenuecat-subscription@…, delete-user-account@…
EMAIL_CONFIRM_REQUIRED=yes/no
```

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| 1 Project | | |
| 2 Redirect URLs | | |
| 3 Apple provider | | |
| 4 Secrets (names) | | |
| 5 Function deploys | | |
| 6 Email confirm setting | | |
