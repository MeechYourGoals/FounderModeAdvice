# 8 — Lovable (web env / AASA Team ID)

**Start URL (log in first):** https://lovable.dev/projects/3d30aa39-abcb-406b-9441-e7a7f14b5734

**You are already signed in.** Paste everything below the line into the browser agent.

Need from script 1:
APPLE_TEAM_ID (10-character)

--- COPY FROM HERE ---

You are setting the production web env so universal links / webcredentials work for the iOS app. Work ONLY in this authenticated Lovable project (Founder Mode Advice, id `3d30aa39-abcb-406b-9441-e7a7f14b5734`). The production origin is https://foundermodeadvice.com

Ledger: DONE / BLOCKED / USER ACTION REQUIRED / FAILED. Do not print Supabase service-role keys or other secrets. APPLE_TEAM_ID is not a secret.

**Pause for my OK before:** changing production env vars other than VITE_APPLE_TEAM_ID; triggering a production publish; changing the custom domain.

## Steps

### 1. Confirm project + domain
Open https://lovable.dev/projects/3d30aa39-abcb-406b-9441-e7a7f14b5734
Confirm this is Founder Mode Advice and that the live custom domain is **foundermodeadvice.com**. If the domain is missing or different, STOP.

### 2. Set VITE_APPLE_TEAM_ID
Open Project → Settings → Environment variables (or Secrets / Env, whatever this UI calls it).

Add or update:
- Name: `VITE_APPLE_TEAM_ID`
- Value: the 10-character Apple Team ID from the Apple Developer script
- Scope: production / published app (not only preview)

Do not remove `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY`.

If the UI has no env-var screen, mark USER ACTION REQUIRED and tell me exactly what settings exist (screenshots of labels only).

### 3. Publish
Pause for my OK, then publish/redeploy so https://foundermodeadvice.com is rebuilt. The build stamps `public/.well-known/apple-app-site-association` replacing `TEAMID` with the real Team ID.

### 4. Verify AASA
After publish, open:
https://foundermodeadvice.com/.well-known/apple-app-site-association

Verify:
- HTTP 200
- Content-Type includes `application/json` (or `text/plain` is a warning, not always fatal)
- Body contains `APPLE_TEAM_ID.com.foundermodeadvice.app` (NOT the placeholder `TEAMID.com.foundermodeadvice.app`)
- JSON has `applinks` and `webcredentials`

If it still says TEAMID, the env var did not reach the Vite build — BLOCKED.

Also hit https://foundermodeadvice.com/privacy-policy and https://foundermodeadvice.com/account-deletion — both must 200 (App Store Connect links).

### 5. Do not
Do not change bundle ids, Stripe keys, or disable Sign in with Apple on the web. Do not point production at a Lovable preview URL.

## CAPTURE

```
LOVABLE_PROJECT=3d30aa39-abcb-406b-9441-e7a7f14b5734
CUSTOM_DOMAIN=foundermodeadvice.com
VITE_APPLE_TEAM_ID_SET=yes/no
AASA_URL=https://foundermodeadvice.com/.well-known/apple-app-site-association
AASA_HAS_REAL_TEAM_ID=yes/no
PRIVACY_POLICY_200=yes/no
ACCOUNT_DELETION_200=yes/no
```

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| 1 Project/domain | | |
| 2 VITE_APPLE_TEAM_ID | | |
| 3 Publish | | |
| 4 AASA live | | |
