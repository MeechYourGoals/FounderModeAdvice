# Founder Mode Advice — Store Readiness Runbook

Last updated: 2026-06-08

This repo is a Vite/React/Supabase app with Capacitor and Despia native hooks. It is not an Expo project today: there is no `app.json`, `app.config.ts`, `eas.json`, `ios/`, or `android/` project committed. Use **Despia** for the fastest web-wrapped native launch, or generate Capacitor projects with the scripts added in `package.json`.

## Current repo-contained readiness status

| Area | Score | Status |
| --- | ---: | --- |
| Web/PWA | 90 | Buildable Vite app, app manifest, safe-area UI, scoped offline cache. Broad Supabase service-worker runtime caching is intentionally disabled. |
| Despia native wrapper | 90 | Native share/haptics/paywall hooks exist; purchase success is only trusted after callback + server RevenueCat verification. |
| Capacitor native wrapper | 88 | Config/scripts exist, but native `ios/` and `android/` projects must be generated and configured externally before store upload. |
| Expo/EAS | 35 | Not configured. Use only after adding an Expo wrapper or migrating to React Native. |
| Store compliance | 88 | In-app deletion, legal routes, IAP boundaries, and review notes exist. External dashboards/secrets/privacy forms remain blockers. |

## Required preflight commands

Run before any native upload:

```bash
npm ci
npm run lint
npm run build
npm run cap:sync
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
ONESIGNAL_APP_ID
ONESIGNAL_REST_API_KEY
APP_URL=https://foundermodeadvice.com
```

`sync-revenuecat-subscription` refuses to overwrite subscription state if `REVENUECAT_API_KEY` is missing.

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

## Google Play checklist

1. Create package `com.foundermodeadvice.app`.
2. Ensure native project targets the current Play-required Android API level before upload.
3. Configure subscriptions and connect them to RevenueCat.
4. Complete Data Safety form and account deletion URL:
   - `https://foundermodeadvice.com/account-deletion`
5. Configure FCM/OneSignal if push is enabled.
6. Test internal track on real Android device:
   - auth, purchase, restore, account deletion, push opt-in, offline saved content.

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
11. Run sandbox purchase and restore tests.
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
