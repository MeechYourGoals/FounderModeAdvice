# RevenueCat ↔ Apple ↔ App Mapping (source of truth)

Status legend: ✅ implemented in repo · 🔧 external console setup required · ❓ decision pending (see BLOCKERS.md)

## The chain, end to end

```
Apple subscription group "Founder Mode Advice Subscriptions"        🔧
 ├─ seed_monthly      ($9.99/mo,  "The C-Suite",  group level 2)    🔧 create in ASC
 └─ series_z_monthly  ($19.99/mo, "The Boardroom", group level 1)   🔧 create in ASC
        │  (products imported into RevenueCat)
RevenueCat project → Apple app (bundle com.foundermodeadvice.app)   🔧
 ├─ Entitlements (structure ❓ — see below)
 ├─ Offering "default"                                              🔧
 │   ├─ package $rc_monthly        → series_z_monthly
 │   └─ package c_suite_monthly    → seed_monthly
 └─ Offering packages only — the iOS binary no longer presents the
    dashboard RevenueCat paywall template. The Expo shell shows
    native/Paywall.tsx (length, features, auto-renew, cancel path,
    Privacy/Terms, Restore) and purchases via StoreKit.             ✅
        │
Expo shell (native/App.tsx)                                         ✅
 ├─ Purchases.configure(apiKey=appl_…, appUserID=<supabase uuid>)   ✅
 ├─ RevenueCatUI.presentPaywall / presentPaywallIfNeeded            ✅
 ├─ restorePurchases with explicit web-layer ack                    ✅
 └─ presentCustomerCenter (manage subscription)                     ✅
        │  window.iapSuccess()
Web app (SubscriptionContext)                                       ✅
 └─ invoke sync-revenuecat-subscription (fallback tier IGNORED)     ✅
        │
Supabase edge functions                                             ✅ (deploy 🔧)
 ├─ _shared/revenuecat.ts — entitlement map + REST verification     ✅
 ├─ sync-revenuecat-subscription — JWT-authed re-verify → upsert    ✅
 └─ revenuecat-webhook — Authorization-header-authed re-verify      ✅ NEW
        │
user_subscriptions.tier  →  all feature gating (client UX + server) ✅
 └─ analyze-episode / video-chat re-read tier server-side           ✅
```

## Identifier map (must never fork)

| Identifier (RevenueCat entitlement or product) | Internal tier |
| --- | --- |
| `Founder Mode Advisor Pro` | series_z |
| `founder_mode_advisor_pro` | series_z |
| `series_z_subscription` | series_z |
| `series_z_monthly` (product) | series_z |
| `seed_subscription` | seed |
| `seed_monthly` (product) | seed |

Enforced in three places, checked by `npm run test:subscription-mapping`:
`src/types/subscription.ts` (client UX), `supabase/functions/_shared/revenuecat.ts`
(single edge-side map used by both the sync function and the webhook).

## Entitlement structure — decision required ❓

Two paid tiers cannot share one entitlement. Recommended dashboard setup
(**Option A — two entitlements, per tier**):

| Entitlement id | Attached product | Unlocks |
| --- | --- | --- |
| `seed_subscription` | `seed_monthly` | The C-Suite features |
| `series_z_subscription` | `series_z_monthly` | The Boardroom features |

The code already resolves both (and falls back to product identifiers), so
Option A requires **no code change**. The legacy `Founder Mode Advisor Pro`
identifier remains supported for backward compatibility but should NOT be
attached to `seed_monthly` (it maps to series_z and would over-grant).
`presentPaywallIfNeeded({requiredEntitlement: "Founder Mode Advisor Pro"})`
then behaves as: free and C-Suite users see the paywall (upsell), Boardroom
users skip it — which matches the product intent.

Option B (single `Founder Mode Advisor Pro` entitlement on both products) is
NOT recommended: a C-Suite purchase would carry a series_z-mapped entitlement
and over-grant Boardroom features (server maps by product id, client by
entitlement id — they would disagree).

## Purchase / restore / identity behavior (implemented)

| Concern | Behavior |
| --- | --- |
| App User ID | Supabase auth UUID — stable, non-guessable, never email. Configured on `identify` bridge message at login. ✅ |
| Anonymous users | RevenueCat is not configured until login; the app is auth-first, purchases require an account. ✅ |
| Login/switch | `Purchases.logIn(newUserId)` awaited before any purchase UI. ✅ |
| Logout | `Purchases.logOut()` + OneSignal logout. ✅ |
| Restore | Native `restorePurchases()` with explicit success/failure ack to the web layer (no false "restored" toast); server re-verifies afterward. ✅ |
| Restore transfers | Webhook TRANSFER event re-syncs both `transferred_from` and `transferred_to` users. ✅ |
| Duplicate taps | Web: one purchase flow at a time (`upgradeInFlightRef`); Shell: `purchaseUIActiveRef` drops re-entrant paywall/customer-center messages. ✅ |
| Entitlement gating | Server: `user_subscriptions.tier` written only from RevenueCat REST verification (or Paddle webhook); AI functions re-read tier per request. Client: `CustomerInfo.entitlements.active` equivalents resolved through the identifier map above. ✅ |
| Refresh points | Launch, login/logout, purchase success, restore success, customer-center close, and app foreground (30s-throttled visibilitychange). ✅ |
| Lapse/downgrade path | `revenuecat-webhook` (EXPIRATION, CANCELLATION, BILLING_ISSUE, REFUND…) re-verifies and downgrades server state even when the app is closed. ✅ (deploy + dashboard URL 🔧) |
| Web (Paddle) coexistence | Every RevenueCat-driven write blends in the active Paddle tier (`fetchActivePaddleTier`) so adding Apple IAP can never clobber an existing web subscription down to free. Apple IAP is never offered pricing/checkout via web rails inside the app (no external purchase links). ✅ |
| Test Store protection | Production EAS builds fail at config time if the key is missing/`test_…`/non-`appl_` (native/app.config.ts), and the shell refuses `test_` keys at runtime in release builds. ✅ |
| Prices in UI | Native contexts never render fixed USD amounts; the RevenueCat paywall (StoreKit) is the only price source. Web keeps $9.99/$19.99 (Paddle). ✅ |

## Webhook contract (supabase/functions/revenuecat-webhook)

- Auth: `Authorization` header must equal the `REVENUECAT_WEBHOOK_AUTH` secret
  (configure the same literal value in the RevenueCat webhook settings).
  Constant-time comparison; 401 otherwise. No RevenueCat secret ever reaches the client.
- Processing: event payload is used ONLY to identify affected user ids
  (`app_user_id`, `original_app_user_id`, `aliases`, `transferred_from/to`,
  filtered to UUID shape). State is re-fetched from the RevenueCat REST API and
  blended with Paddle — idempotent and replay-safe by construction; replays
  simply re-sync current truth. RevenueCat's raw-body HMAC scheme is not used
  because RevenueCat authenticates webhooks via the Authorization header; the
  re-verification design removes any incentive to forge payloads (a forged
  event can only trigger a re-sync against RevenueCat's own records).
- Failure: 5xx on verification failure so RevenueCat retries.

## Sandbox validation sequence (run on a TestFlight/dev build)

1. Fresh sandbox Apple ID; buy The C-Suite → entitlement `seed_subscription`
   active in RC dashboard → `user_subscriptions.tier = 'seed'` within seconds.
2. Upgrade to The Boardroom in the same group → tier becomes `series_z`.
3. Cancel in sandbox settings → after accelerated expiry, webhook downgrades tier to `free`.
4. Reinstall → Restore Purchases → tier restored; second device with same
   account → tier present after launch sync.
5. Purchase-cancel mid-sheet → no entitlement, no error toast beyond "cancelled" state.
