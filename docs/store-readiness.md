# Founder Mode Advice — Store Readiness Runbook

Last updated: 2026-06-08

This repo is a Vite/React/Supabase app with an **Expo/EAS shell app committed in `native/`** (plan of record for the store launch — see `native/README.md` and `docs/mobile-wrapping.md`), plus Capacitor and Despia native hooks as alternatives.

## Current repo-contained readiness status

| Area | Score | Status |
| --- | ---: | --- |
| Web/PWA | 90 | Buildable Vite app, app manifest, safe-area UI, scoped offline cache. Broad Supabase service-worker runtime caching is intentionally disabled. |
| Despia native wrapper | 90 | Native share/haptics/paywall hooks exist; purchase success is only trusted after callback + server RevenueCat verification. |
| Capacitor native wrapper | 88 | Config/scripts exist, but native `ios/` and `android/` projects must be generated and configured externally before store upload. |
| Expo/EAS | 88 | Shell app committed in `native/` (SDK 57): WebView + bridge (haptics/IAP/push/share/theme), `eas.json` build+submit profiles. Remaining: `eas init` (project id), EAS env vars (RevenueCat keys, OneSignal id), store credentials. |
| Store compliance | 90 | In-app deletion, legal routes, IAP boundaries, private-content RLS hardening, screenshot tooling, and review notes exist. External dashboards/secrets/privacy forms remain blockers. |

## Required preflight commands

Run before any native upload:

```bash
npm ci
npm run lint
npm run build
npm run test:subscription-mapping
npm run cap:sync
```

Generate store screenshots after `npm run dev` or `npm run preview` is serving the app. Authenticated screens require `APP_SCREENSHOT_EMAIL` and `APP_SCREENSHOT_PASSWORD` for a seeded demo account:

```bash
APP_SCREENSHOT_BASE_URL=http://localhost:8080 \
APP_SCREENSHOT_EMAIL=reviewer@example.com \
APP_SCREENSHOT_PASSWORD='replace-me' \
npm run screenshots
```

For Capacitor-first release, generate native projects once:

```bash
npm run cap:add:ios
npm run cap:add:android
npm run cap:build:ios
npm run cap:build:android
```

## Billing boundary

- Web browser/PWA subscriptions use Stripe checkout/customer portal.
- iOS/Android installed-app contexts use RevenueCat/Despia IAP only.
- Stripe checkout and portal helpers are blocked in native contexts to avoid App Store digital-goods violations.

RevenueCat identifiers must stay aligned across:

- `src/types/subscription.ts`
- `supabase/functions/sync-revenuecat-subscription/index.ts`
- RevenueCat dashboard entitlements/products/packages
- App Store Connect / Google Play subscription product IDs

Accepted entitlement/product identifiers in code today:

- `Founder Mode Advisor Pro` → `series_z`
- `founder_mode_advisor_pro` → `series_z`
- `series_z_subscription` → `series_z`
- `series_z_monthly` → `series_z`
- `seed_subscription` → `seed`
- `seed_monthly` → `seed`

## Database and Supabase readiness

The forward migration `20260608090000_harden_private_content_rls.sql` removes legacy public/demo RLS policies from episode, lesson, callout, tag assignment, and personalized-insight data. Apply it before production launch, then manually verify:

- unauthenticated clients cannot read private episode/library data;
- authenticated users can read/delete only their own analyses;
- admins can read/delete all analyses;
- service-role edge functions can still create analyses, lessons, callouts, tags, and transcripts.

## Required Supabase secrets

Set these in Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
LOVABLE_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_SEED_PRICE_ID
STRIPE_SERIES_Z_PRICE_ID
REVENUECAT_API_KEY
REVENUECAT_WEBHOOK_AUTH_TOKEN
ONESIGNAL_APP_ID
ONESIGNAL_REST_API_KEY
APP_URL=https://foundermodeadvice.com
```

`sync-revenuecat-subscription` refuses to overwrite subscription state if `REVENUECAT_API_KEY` is missing.

`revenuecat-webhook` keeps subscriptions in sync when state changes outside
the app (renewals, cancellations, expirations, billing issues). It requires
both `REVENUECAT_API_KEY` (server-side re-verification — the webhook payload
is never trusted) and `REVENUECAT_WEBHOOK_AUTH_TOKEN` (shared secret; generate
a long random string and configure the same value as the webhook's
Authorization header in the RevenueCat dashboard).

## Required frontend env vars

Set these in the hosting/native build environment:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_APP_URL
VITE_STRIPE_SEED_PRICE_ID
VITE_STRIPE_SERIES_Z_PRICE_ID
VITE_REVENUECAT_IOS_API_KEY
VITE_REVENUECAT_ANDROID_API_KEY
VITE_ONESIGNAL_APP_ID
APP_SCREENSHOT_BASE_URL=http://localhost:8080 (local screenshot runs only)
APP_SCREENSHOT_EMAIL=reviewer@example.com (local screenshot runs only)
APP_SCREENSHOT_PASSWORD=replace-me (local screenshot runs only)
```

`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are fail-fast required at app startup.
RevenueCat native API keys are fail-fast required when Capacitor RevenueCat initializes in native iOS/Android.

## App Store Connect checklist

1. Create bundle ID `com.foundermodeadvice.app`.
2. Configure Sign in with Apple if Apple auth is enabled.
3. Create subscriptions for The C-Suite and The Boardroom.
4. Connect products to RevenueCat offering `default`.
5. Complete App Privacy labels based on actual data use:
   - email/account identifiers
   - user startup profiles and saved analyses
   - subscription purchase history via RevenueCat/Apple
   - push token/preferences via OneSignal if enabled
   - diagnostics/logs if collected by native wrappers
6. Add support URL, privacy policy URL, terms URL, and account deletion URL.
7. Upload screenshots and demo account credentials.
8. Confirm in TestFlight on real hardware:
   - Google/Apple/email sign-in
   - free limit enforcement
   - purchase, cancel, restore, expiration
   - account deletion
   - offline saved content
   - native share/haptics
   - no Stripe checkout visible in iOS app
   - screenshots generated for landing, auth, dashboard, settings, and account screens

## Google Play checklist

1. Create package `com.foundermodeadvice.app`.
2. Ensure native project targets the current Play-required Android API level before upload.
3. Configure subscriptions and connect them to RevenueCat.
4. Complete Data Safety form and account deletion URL:
   - `https://foundermodeadvice.com/account-deletion`
5. Configure FCM/OneSignal if push is enabled.
6. Test internal track on real Android device:
   - auth, purchase, restore, account deletion, push opt-in, offline saved content, screenshots.

## Privacy manifest / native project notes

When native projects are generated, add iOS `PrivacyInfo.xcprivacy` entries for Apple-required APIs and SDK data collection used by Capacitor plugins, RevenueCat, OneSignal, Supabase auth/storage, and the webview. This cannot be committed accurately until the native iOS project exists.

## Agentic browser script — Supabase

```text
1. Open https://supabase.com/dashboard.
2. Select the Founder Mode Advice project.
3. Open Authentication → URL Configuration.
4. Add allowed redirect URLs:
   - https://foundermodeadvice.com/auth/callback
   - http://localhost:8080/auth/callback
   - com.foundermodeadvice.app://auth/callback
5. Open Edge Functions → Secrets.
6. Add SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, LOVABLE_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_SEED_PRICE_ID, STRIPE_SERIES_Z_PRICE_ID, REVENUECAT_API_KEY, ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY, APP_URL.
7. Deploy all edge functions.
8. Verify `delete-user-account` and `sync-revenuecat-subscription` return 401 without auth and succeed with a valid test user.
```

## Agentic browser script — RevenueCat

```text
1. Open https://app.revenuecat.com.
2. Create/open Founder Mode Advice project.
3. Add iOS app with bundle ID com.foundermodeadvice.app.
4. Add Android app with package com.foundermodeadvice.app.
5. Create entitlement `Founder Mode Advisor Pro` or `founder_mode_advisor_pro`.
6. Add products/packages `seed_monthly` and `series_z_monthly`.
7. Create offering `default` and attach the packages.
8. Copy iOS public SDK key to VITE_REVENUECAT_IOS_API_KEY.
9. Copy Android public SDK key to VITE_REVENUECAT_ANDROID_API_KEY.
10. Copy secret API key to Supabase secret REVENUECAT_API_KEY.
11. Open Integrations → Webhooks → Add webhook:
    - URL: https://iffcuueutmsusgdfekvm.supabase.co/functions/v1/revenuecat-webhook
    - Authorization header: the value of the REVENUECAT_WEBHOOK_AUTH_TOKEN Supabase secret
    - Events: all subscription lifecycle events (or at minimum initial purchase,
      renewal, cancellation, uncancellation, expiration, billing issue, product change).
    - Send a test event and confirm a 200 response in the webhook log.
12. Confirm Android subscription management opens Google Play subscriptions and iOS opens Apple subscriptions.
13. Run sandbox purchase and restore tests.
```

## Agentic browser script — App Store Connect

```text
1. Open https://appstoreconnect.apple.com.
2. Create app: Founder Mode Advice, bundle ID com.foundermodeadvice.app.
3. Complete App Information, age rating, pricing, support URL, privacy URL, terms URL.
4. Create subscription group and products for The C-Suite and The Boardroom.
5. Complete App Privacy labels to match this app's actual Supabase/RevenueCat/OneSignal/AI data use.
6. Upload native build from Despia or Capacitor.
7. Add demo account credentials and corrected APP_REVIEW_NOTES.md notes.
8. Submit only after TestFlight purchase, restore, deletion, offline, OAuth, and share checks pass.
```

## Agentic browser script — Google Play

```text
1. Open https://play.google.com/console.
2. Create app with package com.foundermodeadvice.app.
3. Complete Main store listing, content rating, target audience, privacy policy, and Data Safety.
4. Add account deletion URL https://foundermodeadvice.com/account-deletion.
5. Create subscriptions matching RevenueCat product IDs.
6. Upload AAB to Internal testing.
7. Confirm target API compliance, purchase/restore, deletion, OAuth, push, and offline behavior.
8. Promote only after internal testing passes.
```
