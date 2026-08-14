# 3 — RevenueCat

**Start URL (log in first):** https://app.revenuecat.com

**You are already signed in.** Paste everything below the line into the browser agent.

Need from previous scripts (paste here):
APPLE_TEAM_ID, ASC_APP_ID_NUMERIC, IAP_KEY_ID, IAP_ISSUER_ID
(You will upload the App Store Connect In-App Purchase .p8 yourself when asked.)

--- COPY FROM HERE ---

You are configuring RevenueCat for **Founder Mode Advice** iOS (bundle id `com.foundermodeadvice.app`, company Saint Marlo Labs LLC). Work ONLY in this authenticated app.revenuecat.com session. You may open appstoreconnect.apple.com in a tab only to read Key ID / Issuer ID if I already have that page open; do not create Apple resources here.

Ledger: DONE / BLOCKED / USER ACTION REQUIRED / FAILED + evidence. Never paste .p8 contents, secret API keys, webhook authorization secrets, or passwords into chat. I type secrets into forms myself.

**Pause for my OK before:** creating the project or Apple app (if none exists); attaching products; saving entitlements; creating a webhook; any plan upgrade.

Inspect before creating. Reuse existing project/app/entitlements/offerings if identifiers already match. On conflicts STOP.

## Target (do not improvise identifiers)

- Project name: Founder Mode Advice
- Apple app name: Founder Mode Advice (iOS)
- Bundle ID: **com.foundermodeadvice.app**
- Products: `seed_monthly` ($9.99/mo, The C-Suite), `series_z_monthly` ($19.99/mo, The Boardroom)
- Entitlements (Option A, already confirmed):
  - `seed_subscription` ← product `seed_monthly` only
  - `series_z_subscription` ← product `series_z_monthly` only
  - Do NOT attach seed_monthly to any series_z / “Founder Mode Advisor Pro” entitlement (that would over-grant Boardroom).
- Offering identifier: `default` (Current)
  - package `$rc_monthly` → `series_z_monthly`
  - custom package `c_suite_monthly` → `seed_monthly`
- Webhook URL: `https://iffcuueutmsusgdfekvm.supabase.co/functions/v1/revenuecat-webhook`
- Public iOS SDK key env var name (for Expo later): `FMA_REVENUECAT_IOS_API_KEY` (starts with `appl_`)
- Secret API key name (Supabase only): `REVENUECAT_API_KEY`
- Webhook auth header secret name: `REVENUECAT_WEBHOOK_AUTH`

## Steps

### 1. Project & Apple app
Search existing projects for Founder Mode Advice. Reuse if present. Add/verify Apple App Store app with bundle ID **exactly** `com.foundermodeadvice.app`. If an Apple app exists with a different bundle id → USER ACTION REQUIRED, do not silently edit.

Record the **Public app-specific SDK key** (starts `appl_`). Public-class; you may print it in CAPTURE.

### 2. In-App Purchase key
Apple app settings → In-App Purchase Key / App Store Connect API.
USER ACTION REQUIRED: I upload the .p8 from App Store Connect (Users and Access → Integrations → In-App Purchase). You fill **Key ID** and **Issuer ID** from my CAPTURE (those two are safe). Verify the connection shows valid. Do not request the file contents in chat.

### 3. Import products
After `seed_monthly` and `series_z_monthly` exist in App Store Connect, use Import from App Store Connect. If import is empty, STOP — products are not ready in ASC. If adding manually, identifiers must match **exactly** (typos break the server entitlement map).

### 4. Entitlements
Create or reuse:
- `seed_subscription` attached only to `seed_monthly`
- `series_z_subscription` attached only to `series_z_monthly`
If a leftover “Founder Mode Advisor Pro” entitlement exists, do not attach `seed_monthly` to it. Record what you found.

### 5. Offering `default`
Make it Current. Packages:
- `$rc_monthly` → `series_z_monthly`
- `c_suite_monthly` → `seed_monthly`
Verify the offering preview shows both products.

### 6. Paywall + Customer Center
Attach a Paywall v2 to offering `default`:
- Both packages, **store-localized prices only** (no hardcoded $9.99/$19.99 in the template)
- Plan names: The C-Suite / The Boardroom
- C-Suite bullets: 20 analyses/month, private document upload, up to 5 business profiles
- Boardroom bullets: unlimited analyses/profiles, Ask-the-video Q&A, exports, team sharing
- Footer links REQUIRED:
  - Privacy Policy → https://foundermodeadvice.com/privacy-policy
  - Terms of Service → https://foundermodeadvice.com/terms-of-service
- Restore Purchases control enabled
- Dark background approximating #0c0e15
Enable **Customer Center** (default settings) — the iOS app presents it for Manage Subscription.

### 7. Apple Server Notifications
Copy the Production and Sandbox **Apple Server Notification URLs** RevenueCat shows for this Apple app. Put them in CAPTURE. I (or a follow-up on App Store Connect) will paste them into App Store Connect → App → App Information → App Store Server Notifications **V2** (both fields).

### 8. Webhook
Integrations → Webhooks → add (reuse if URL already matches):
- URL: `https://iffcuueutmsusgdfekvm.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header: USER ACTION REQUIRED — I generate a long random string and paste the **same** value here and later as Supabase secret `REVENUECAT_WEBHOOK_AUTH`. You verify the webhook is saved; never echo the secret.
- Events: all subscription lifecycle (initial purchase, renewal, cancellation, expiration, billing issue, refund, product change, transfer)
- Environments: sandbox AND production

### 9. Secret API key
Project settings → API keys. Identify the **Secret** v1 key (not the public `appl_` key). USER ACTION REQUIRED: I copy it only into Supabase secret `REVENUECAT_API_KEY`. You confirm a secret key exists; do not print it.

### 10. Sandbox check (if an EAS build already exists)
Otherwise mark NOT TESTED. When a sandbox purchase happens: customer should show a UUID app user id (not $RCAnonymousID, not email); `seed_monthly` grants `seed_subscription`; webhook deliveries show 2xx from the Supabase URL.

## CAPTURE

```
RC_PUBLIC_IOS_SDK_KEY=appl_…
RC_APPLE_APP_BUNDLE=com.foundermodeadvice.app
RC_ENTITLEMENTS=seed_subscription, series_z_subscription
RC_OFFERING=default
RC_PACKAGES=$rc_monthly→series_z_monthly, c_suite_monthly→seed_monthly
RC_APPLE_SERVER_NOTIFICATIONS_PRODUCTION=
RC_APPLE_SERVER_NOTIFICATIONS_SANDBOX=
RC_WEBHOOK_URL=https://iffcuueutmsusgdfekvm.supabase.co/functions/v1/revenuecat-webhook
RC_WEBHOOK_AUTH_SET_IN_RC=yes/no (do not print secret)
RC_SECRET_KEY_EXISTS=yes/no (do not print)
```

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| 1 Project/app + appl_ key | | |
| 2 IAP .p8 connection | | |
| 3 Products imported | | |
| 4 Entitlements | | |
| 5 Offering/packages | | |
| 6 Paywall/Customer Center | | |
| 7 Apple Server Notification URLs | | |
| 8 Webhook | | |
| 9 Secret key exists | | |
| 10 Sandbox | | |
