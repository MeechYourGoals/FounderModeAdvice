# 7 — PostHog

**Start URL (log in first):** https://us.posthog.com

**You are already signed in.** Paste everything below the line into the browser agent.

This is only required so **account deletion** can erase the person’s analytics record. The iOS app already identifies with the Supabase user UUID.

--- COPY FROM HERE ---

You are collecting PostHog project identifiers for Founder Mode Advice account-deletion. Work ONLY in this authenticated us.posthog.com session.

Ledger: DONE / BLOCKED / USER ACTION REQUIRED / FAILED. Never print personal API keys (`phx_`) in chat. Project API keys that start with `phc_` are public-class (they ship in the app) — you may record those.

**Pause for my OK before:** creating a new project; enabling session replay; changing autocapture on.

## Steps

### 1. Select the right project
Find the project used by Founder Mode Advice (not an unrelated product). Hints: name contains Founder Mode / FMA / Saint Marlo; or the project public key matches whatever is already in the web app’s `VITE_POSTHOG_KEY` (starts `phc_`). If multiple projects, STOP and list them for me.

### 2. Confirm privacy-safe settings (installed-app analytics)
Project settings:
- Session replay: should be **off** for this product (we disclosed “no session replay”).
- Autocapture: should be **off** (we send explicit events only).
If either is on, pause — I decide whether to turn it off (turning it off is the policy-consistent choice).

### 3. IDs for Supabase deletion
- Record **Project ID** (numeric or UUID shown in project settings / URL).
- Record **Host**: `https://us.i.posthog.com` unless this project is on a different region.
- Personal API key: USER ACTION REQUIRED — I create a personal API key with permission to delete persons, and paste it only into Supabase secret `POSTHOG_PERSONAL_API_KEY`. You confirm a personal API key exists; do not print it.

I will set these Supabase Edge Function secrets (script 4):
- POSTHOG_HOST
- POSTHOG_PROJECT_ID
- POSTHOG_PERSONAL_API_KEY

### 4. Do not
Do not export persons. Do not change the public `phc_` key. Do not enable advertising/toolbar features.

## CAPTURE

```
POSTHOG_PROJECT_NAME=
POSTHOG_PROJECT_ID=
POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_SESSION_REPLAY=off/on
POSTHOG_AUTOCAPTURE=off/on
POSTHOG_PERSONAL_KEY_CREATED=yes/no (do not print)
```

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| 1 Project selected | | |
| 2 Replay/autocapture | | |
| 3 Project ID + personal key exists | | |
