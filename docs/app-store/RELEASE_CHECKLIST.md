# Release Checklist — iOS 1.0 (Expo shell, EAS)

The shortest safe path from this branch to App Review. Steps are ordered;
don't reorder across sections. ☐ = to do, ✅ = done in this branch.

## 0. Repo state (this branch) ✅

- ✅ Expo SDK 57 / RN 0.86 pins verified current; deps aligned with
  bundledNativeModules (expo install --fix = no-op)
- ✅ eas.json: per-profile EAS environments, remote versioning,
  autoIncrement, no fake ascAppId, no dead update channels
- ✅ app.json/app.config.ts: production release guard (missing/test_/non-appl_
  RevenueCat key or non-production web origin fails the build), camera/photo
  purpose strings, iPad orientations, encryption declaration
- ✅ Shell: paywall re-entrancy guard, silent push registration vs contextual
  permission prompt, Test Store key refusal in release builds
- ✅ Web: no fixed prices in native contexts, subscription disclosure +
  legal links on plan surfaces, restore ack, foreground entitlement refresh,
  AI-processing consent dialog, deletion dialog with manage-subscription route
- ✅ Backend: shared entitlement verifier, revenuecat-webhook (downgrade
  path), Paddle-blend protection, deletion completeness
- ✅ Legal pages updated (AI vendors, PostHog, Apple IAP, refunds via Apple)
- ✅ Validations recorded in APP_STORE_READINESS.md

## 1. Backend deploy ☐

1. ☐ Supabase secrets: `REVENUECAT_API_KEY` (secret v1 key),
   `REVENUECAT_WEBHOOK_AUTH` (generate a long random string), confirm
   `SUPADATA_API_KEY`, `LOVABLE_API_KEY`, `CRON_SECRET`, Paddle secrets.
2. ☐ `supabase functions deploy revenuecat-webhook sync-revenuecat-subscription delete-user-account`
3. ☐ Deploy the web app (legal-page updates + native price/consent behavior
   ship with the site the shell loads).

## 2. Console configuration ☐ (browser prompts provided)

4. ☐ Apple: membership/agreements/tax/banking → bundle id → app record →
   subscription group + products → App Privacy → review info
   (CHATGPT_WORK_APP_STORE_CONNECT_PROMPT.md).
5. ☐ RevenueCat: project → Apple app → IAP key (.p8, user-assisted) →
   import products → entitlements (per D1) → offering `default` + packages →
   paywall → webhook URL + auth header → Apple Server Notifications URLs
   copied into ASC (CHATGPT_WORK_REVENUECAT_PROMPT.md).
6. ☐ `cd native && eas init` (owner account) → commit the projectId change.
7. ☐ EAS env vars per environment (FMA_REVENUECAT_IOS_API_KEY=appl_…,
   FMA_ONESIGNAL_APP_ID; leave FMA_WEB_URL unset in production).
8. ☐ Optional now / required for universal links: deploy
   `.well-known/apple-app-site-association` with the real Team ID
   (EXTERNAL_SETUP_VALUES.json §universalLinks).

## 3. Development-build test pass ☐

9.  ☐ `eas build --profile development --platform ios` → install on device.
10. ☐ Run FINAL TEST GATE steps 1–9 (auth, consent, analysis, offline,
    library) + sandbox purchase/restore/manage (steps 10–16) + iPad visual QA
    (step 20). Log results in APP_STORE_READINESS.md.
11. ☐ Capture authenticated screenshots + paywall review screenshot
    (SCREENSHOT_BRIEF.md) once the demo account is seeded.

## 4. Production candidate ☐

12. ☐ `eas build --profile production --platform ios` (config guard must pass
    green — if it throws, an env var is wrong; fix the env, not the guard).
13. ☐ `eas submit --platform ios` (record ascAppId into eas.json for next time).
14. ☐ TestFlight: repeat purchase/restore/entitlement/core tests on the
    UPLOADED build (test gate step 22). Renewal/billing-retry observation via
    sandbox accelerated clock; verify webhook downgrades on expiration.

## 5. Submission ☐

15. ☐ Screenshots uploaded (6.9" + 13"), app privacy answers from
    APP_PRIVACY_MATRIX.md, metadata from APP_STORE_METADATA.md /
    `native/store.config.json`, review notes + demo credentials, BOTH
    subscription products attached to the version, export compliance +
    content rights per metadata doc.
16. ☐ Release option: manual release after approval.
17. ☐ Submit for review. (Approval is never guaranteed; 4.2 posture in
    BLOCKERS.md.)

## FINAL TEST GATE (execute on device builds; keep as the acceptance record)

1. ☐ Fresh install, cold launch, no Metro/dev server
2. ☐ Sign up, login, logout, password recovery, session expiry → reauth
3. ☐ Onboarding + first-analysis AI consent dialog
4. ☐ Create/import each source type (YouTube, article, podcast, X/LinkedIn
   post, PDF upload, image upload)
5. ☐ Memo generation success
6. ☐ Failure/timeout/cancel/retry (airplane mode mid-analysis; invalid URL;
   >20MB file)
7. ☐ Follow-up Q&A (Boardroom account)
8. ☐ Library: folders, search/filter, edit, delete, export (PDF/CSV), share
   invite accept/revoke
9. ☐ Free-tier gating: 3-analysis cap message, upload gate, chat gate
10. ☐ Both StoreKit products load with localized prices on the paywall
11. ☐ Purchase cancellation → no entitlement, no scary error
12. ☐ Sandbox purchase → immediate access (tier badge, upload unlock)
13. ☐ Force quit + relaunch → access persists
14. ☐ Second device, same account → access present
15. ☐ Uninstall/reinstall + Restore Purchases → access recovered
16. ☐ Manage Subscription opens native management
17. ☐ Renewal, expiration, billing-retry/grace, refund (sandbox) →
    user_subscriptions reflects each within webhook latency
18. ☐ Offline launch, slow network, missing offering (temporarily detach
    products in RC sandbox), backend 5xx → graceful states everywhere
19. ☐ Account deletion → auth fails afterward; storage/tables verified empty
20. ☐ Visual QA: iPhone SE-class small screen, 6.9" iPhone, 13" iPad
    (portrait + landscape, Split View)
21. ☐ Production build contains no dev URLs, no test keys (guard enforces),
    no debug banners; console clean of user data
22. ☐ Repeat 10–16 on the exact TestFlight binary submitted for review
