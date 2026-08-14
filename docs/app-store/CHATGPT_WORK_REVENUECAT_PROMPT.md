# ChatGPT Work Prompt — RevenueCat Configuration (authenticated browser)

**Prefer the per-site script** `docs/app-store/browser-scripts/03-revenuecat.md`.
This combined prompt is kept as a fallback.

Copy everything below the line into ChatGPT Work with browser access, signed
into app.revenuecat.com (and appstoreconnect.apple.com for the key step).

---

You are configuring RevenueCat for the iOS release of **Founder Mode Advice**
(bundle id `com.foundermodeadvice.app`, company Saint Marlo Labs LLC). Work
ONLY in the authenticated browser. Maintain a completion ledger — every step
ends in one of: DONE / BLOCKED / USER ACTION REQUIRED / FAILED, with a short
evidence note (what you saw on screen). Never paste passwords, .p8 file
contents, private keys, or 2FA codes into the chat, screenshots, or the ledger.

## Ground rules

1. **Inspect before creating.** At every step, search for an existing record
   first. If an object with the target identifier exists, verify its fields
   against the spec and reuse it — never create duplicates. If an existing
   object CONFLICTS (same purpose, different identifier), STOP that step,
   mark USER ACTION REQUIRED, and list the conflict.
2. **Pause for confirmation before anything immutable or revenue-impacting**:
   creating product identifiers, finalizing prices/trials/regions, uploading
   keys, purchasing/upgrading any plan. State exactly what you are about to
   create and wait for the user's OK in chat.
3. The browser cannot upload files. When a file upload is required (.p8 key),
   hand off: tell the user exactly which screen is open and what to upload,
   wait for them to confirm, then verify the upload landed and continue.
4. After each numbered section, RE-OPEN the saved screen and verify every
   value; record "verified" in the ledger.

## Target configuration

### 1. Project & app
- Project: look for an existing project for Founder Mode Advice (any prior
  test project). If none, create project `Founder Mode Advice`.
- Add platform app: **Apple App Store**, name `Founder Mode Advice (iOS)`,
  bundle ID exactly `com.foundermodeadvice.app`. If an Apple app already
  exists with a DIFFERENT bundle id → USER ACTION REQUIRED (do not edit
  silently).
- Record (in the ledger, they are public): the app's **Public SDK key**
  (starts `appl_`). The user will set it as EAS env var
  `FMA_REVENUECAT_IOS_API_KEY` (development, preview, production).

### 2. App Store Connect credentials
- In the RevenueCat Apple app settings, configure the **In-App Purchase Key**:
  guide the user to App Store Connect → Users and Access → Integrations →
  In-App Purchase Keys → generate/download the .p8 (they keep the file;
  NEVER ask them to paste its contents). USER-ASSISTED UPLOAD: user uploads
  the .p8 in the RevenueCat form; you enter the Key ID and Issuer ID shown
  in App Store Connect (these two identifiers are safe to transcribe).
- App Store Connect API key (broader permissions): configure ONLY if the
  user explicitly wants automated product import/metadata sync; otherwise
  skip — the IAP key suffices for validation. Mark the choice in the ledger.

### 3. Products (import after they exist in App Store Connect)
- `seed_monthly` — The C-Suite, 1-month auto-renewing, $9.99 US base.
- `series_z_monthly` — The Boardroom, 1-month auto-renewing, $19.99 US base.
- Use "Import products" from App Store Connect where offered; otherwise add
  manually with EXACTLY these identifiers. Any typo here breaks entitlement
  mapping (`supabase/functions/_shared/revenuecat.ts`).

### 4. Entitlements — CONFIRM CHOICE FIRST
- Default plan of record (Option A, recommended in the repo's
  REVENUECAT_MAPPING.md): create TWO entitlements:
  - `seed_subscription` ← attach product `seed_monthly`
  - `series_z_subscription` ← attach product `series_z_monthly`
- Do NOT attach anything to a "Founder Mode Advisor Pro" entitlement, and do
  NOT attach `seed_monthly` to any series_z-mapped entitlement (it would
  over-grant). If the user instead confirms a different structure, record it
  and adjust — but get explicit confirmation either way before saving.

### 5. Offering & packages
- Offering identifier: `default` (make it the Current offering).
- Packages:
  - `$rc_monthly` → `series_z_monthly`
  - custom package `c_suite_monthly` → `seed_monthly`
- Verify both packages resolve to their products in the offering preview.

### 6. Paywall
- Attach a Paywall (v2 template) to offering `default`:
  - Shows BOTH packages with store-provided localized prices (no hardcoded
    price text in the template).
  - Copy tone: plan names "The C-Suite" / "The Boardroom" with the feature
    bullets from the repo's `src/types/subscription.ts` TIER_PRICING
    features (top 3–4 each).
  - Footer links — REQUIRED: Privacy Policy →
    https://foundermodeadvice.com/privacy-policy and Terms of Service →
    https://foundermodeadvice.com/terms-of-service. Restore Purchases
    control enabled.
  - Dark scheme to match app background #0c0e15 (Preview it).
- Also enable **Customer Center** with default settings (the app presents it
  for Manage Subscription).

### 7. Server notifications & webhook
- Copy the **Apple Server Notification URLs** (production + sandbox) RevenueCat
  shows for this app → the user (or the ASC prompt) pastes them into App
  Store Connect → App Information → App Store Server Notifications V2 (both
  fields). Ledger-record both URLs.
- Integrations → Webhooks → add webhook:
  - URL: `https://iffcuueutmsusgdfekvm.supabase.co/functions/v1/revenuecat-webhook`
  - Authorization header: the user generates a long random secret and sets
    the SAME value as Supabase secret `REVENUECAT_WEBHOOK_AUTH`. Have them
    paste it directly into both consoles themselves (do not echo it in chat).
  - Events: all subscription lifecycle events. Environment: both sandbox and
    production.
- Ask the user to confirm the Supabase secret `REVENUECAT_API_KEY` (secret
  API key, Project settings → API keys → Secret) is set server-side — the
  webhook and sync function verify entitlements with it.

### 8. Validation (sandbox)
- Project settings: confirm sandbox mode visibility; then have the user run
  a sandbox purchase from an EAS development build (they drive the device;
  you check the RevenueCat Customer view):
  - Customer appears with a UUID app user id (not $RCAnonymousID, not email).
  - Purchase of `seed_monthly` grants `seed_subscription` entitlement.
  - Webhook deliveries page shows 2xx responses from the Supabase URL.
- Record each check in the ledger.

## Ledger format

| Step | Status | Evidence |
| --- | --- | --- |
| 1 Project/app | | |
| 2 IAP key | | |
| 3 Products | | |
| 4 Entitlements | | |
| 5 Offering/packages | | |
| 6 Paywall/Customer Center | | |
| 7 Notifications/webhook | | |
| 8 Sandbox validation | | |
