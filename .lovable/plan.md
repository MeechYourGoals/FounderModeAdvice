# Verify the RevenueCat webhook end to end

Goal: prove that a RevenueCat server notification reaching our backend results in a correctly persisted subscription tier — without inventing data or exposing secrets.

## What's already confirmed

- `revenuecat-webhook` exists and is deployed with `verify_jwt = false` (public endpoint, guarded by the shared `Authorization` value).
- `sync-revenuecat-subscription` is deployed with `verify_jwt = true`.
- Both `REVENUECAT_API_KEY` and `REVENUECAT_WEBHOOK_AUTH` are present in the project secret store (values not readable by me — by design).

## One constraint to be aware of

Because secret values are write-only, I cannot construct an *authorized* webhook request myself. So the verification is split: I can prove the auth gate, the payload handling, the RevenueCat REST verification, and the database write — the only step needing you is a single click in the RevenueCat dashboard ("Send test event") if you want the true dashboard-originated delivery on record.

## Verification steps

1. Unauthenticated probe — POST a realistic `INITIAL_PURCHASE` event body with no/incorrect `Authorization` header. Expected: `401 Unauthorized`. This proves the shared-secret gate is live and that neither secret is missing (missing secrets would return `500`).
2. Anonymous-id probe — same request shape, still unauthorized, confirming no state can be mutated without the secret.
3. Real sync path (the substantive test) — call `sync-revenuecat-subscription` with a minted session for a real test auth user (`test@test.com`). This runs the exact same `syncUserEntitlements` code the webhook runs: RevenueCat REST verification, Paddle blend, and the `user_subscriptions` upsert. Expected: HTTP 200 with a resolved `tier` (`free` for a user with no purchases — that is a valid pass, it proves reachability of the RevenueCat API and a successful write).
4. Database confirmation — read `public.user_subscriptions` for that user and confirm `tier`, `status`, and `updated_at` reflect the sync just performed.
5. Log review — read `revenuecat-webhook` and `sync-revenuecat-subscription` edge function logs to confirm no `not configured` errors and no RevenueCat 401s (a RevenueCat 401 would mean the stored API key is wrong; I'd report that as an external fix, not guess a new key).
6. Dashboard delivery (your one action) — after the above passes, you send a test event from RevenueCat → Webhooks. I then re-read the logs and confirm a `synced` line with a `200` response.

## Outcome

A short ledger: each step, expected vs actual, plus a clear statement of whether the failure mode (if any) is code, configuration, or an external dashboard setting. No files changed — this is verification only.
