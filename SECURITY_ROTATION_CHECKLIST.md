# Pre-launch credential rotation checklist

Date prepared: 2026-09-04

## Evidence and decision

- `.env`, `.env.development`, and `.env.production` were tracked at `main` HEAD and are now removed from the index. Local copies remain ignored.
- A redacted current-tree and all-history scan covered 2,176 text blobs across 834 commits. It found the legacy Supabase publishable JWT in `.env` history, but no service-role, Stripe secret, AI secret, GitHub token, AWS key, Google private API key, or PEM private key pattern.
- Vite variables, Supabase publishable/legacy anon keys, Paddle client tokens, RevenueCat public SDK keys, OneSignal App IDs, and PostHog project keys are client-visible identifiers. They still belong in deployment configuration, not tracked `.env` files.
- No history rewrite is recommended from the scan evidence. Do not run a force-push or history rewrite without Christian's explicit approval.

## Safe rotation order

For each credential below: create a replacement, add it to the correct server-side deployment environment, deploy the dependent function/app, run the listed smoke test, then revoke the old credential. Never paste a value into GitHub, Lovable chat, a ticket, a PR, or this document.

- [ ] **Supabase `service_role`** — rotate last because multiple edge functions depend on it. Update every function environment, deploy, test account deletion, billing sync, analysis creation, and scheduled jobs, then revoke the old key.
- [ ] **Stripe** — rotate `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; keep the two allowed price IDs as identifiers. Send a signed test event and create one test checkout before revoking old credentials.
- [ ] **Paddle / Lovable payment connections** — rotate `PADDLE_LIVE_API_KEY`, `PADDLE_SANDBOX_API_KEY`, `PAYMENTS_LIVE_WEBHOOK_SECRET`, and `PAYMENTS_SANDBOX_WEBHOOK_SECRET`. Verify both price lookup allowlist entries, a sandbox checkout, signature rejection, and live/sandbox entitlement isolation.
- [ ] **Lovable** — rotate `LOVABLE_API_KEY`. Verify `analyze-episode`, deck parsing, MCP deployment, and Paddle connector-gateway calls.
- [ ] **Cron** — rotate `CRON_SECRET` in the function environment and every scheduler header in one maintenance window. Verify unauthorized calls fail and an authorized dry run succeeds.
- [ ] **OneSignal** — rotate `ONESIGNAL_REST_API_KEY`; confirm `ONESIGNAL_APP_ID` still identifies the intended app. Test one opted-in internal device before revoking the old REST key.
- [ ] **PostHog private credentials** — rotate `POSTHOG_PERSONAL_API_KEY`; confirm `POSTHOG_PROJECT_ID` and private API host. The frontend `VITE_POSTHOG_KEY` is public and should be restricted by PostHog configuration, not treated as a secret.
- [ ] **RevenueCat** — rotate `REVENUECAT_API_KEY` and `REVENUECAT_WEBHOOK_AUTH`. Update the dashboard authorization header and edge-function environment together; send a test webhook and run restore/sync before revocation.
- [ ] **AI and retrieval providers** — rotate `LOVABLE_API_KEY`, `BRAVE_SEARCH_API_KEY`, `EXA_API_KEY`, `YOUTUBE_API_KEY`, and `SUPADATA_API_KEY` wherever configured. Confirm each provider's budget/rate cap and run one internal analysis plus one discovery refresh.
- [ ] **Cloudflare Turnstile** — store the site key only in the web deployment and the secret only in Supabase Auth bot protection. Verify an invalid/missing token is rejected server-side before launch.

## Verification after rotation

- [ ] Search Git-tracked files again with a redacting secret scanner.
- [ ] Confirm the three `.env*` files do not appear in `git ls-files`.
- [ ] Confirm `.env.example` contains variable names only.
- [ ] Run the web build, Deno tests, subscription mapping check, and dependency audit.
- [ ] Exercise Google and Apple OAuth. The Expo shell must continue using native AuthenticationServices / ASWebAuthenticationSession behavior; do not permit in-WebView OAuth fallback.
- [ ] Record the rotation date, credential owner, dependent systems, verification evidence, and revocation result in the private secrets inventory—never the credential value.
