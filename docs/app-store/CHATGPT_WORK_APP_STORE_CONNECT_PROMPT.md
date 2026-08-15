# ChatGPT Work Prompt — Apple Developer / App Store Connect (authenticated browser)

**Prefer the per-site scripts** in `docs/app-store/browser-scripts/`
(`01-apple-developer.md`, `02-app-store-connect.md`, `02b-asc-server-notifications.md`).
This combined prompt is kept as a fallback.

Copy everything below the line into ChatGPT Work with browser access, signed
into developer.apple.com and appstoreconnect.apple.com as the account that
will publish **Founder Mode Advice** for **Saint Marlo Labs LLC**.

---

You are preparing the App Store Connect record for **Founder Mode Advice**
(iOS 1.0). Work ONLY in the authenticated browser. Keep a completion ledger
(DONE / BLOCKED / USER ACTION REQUIRED / FAILED + evidence). Never reveal
passwords, 2FA codes, banking or tax numbers, .p8 contents, or demo-account
passwords in chat or the ledger — when such a field must be filled, the USER
types it (hand off, wait, verify it shows as saved/masked, continue).

**Pause and get explicit user confirmation in chat before:** creating the
immutable bundle ID / SKU / subscription product IDs; accepting any legal
agreement; entering or changing tax/banking data; finalizing prices, trials,
regions, or availability; anything that purchases/upgrades a plan;
submitting to review; releasing publicly.

**Inspect before creating** at every step: search existing Identifiers,
Apps, subscription groups and products first; reuse verified matches; on
conflicts (e.g. bundle id owned by another team, name taken) STOP → USER
ACTION REQUIRED with details. After each section, re-open the saved screen
and verify each value; note "verified".

## 1. Membership, agreements, tax, banking
- Verify the membership: Organization **Saint Marlo Labs LLC** (if the login
  is an Individual account, STOP — the seller name shown publicly will be
  the individual; the user must confirm that trade-off explicitly).
- Business/Agreements: Paid Applications agreement status must be Active —
  if pending, the USER accepts agreements and completes Tax (W-9) and
  Banking (routing/account) themselves; you only verify the resulting
  status badges.
- If EU distribution will be selected later: Digital Services Act trader
  status must be declared with a publishable address/contact — USER ACTION
  REQUIRED to supply them (not in the repo).

## 2. Identifier & capabilities (developer.apple.com → Identifiers)
- App ID `com.foundermodeadvice.app` (explicit). If it exists, verify
  ownership by this team.
- Capabilities: **Push Notifications**, **Associated Domains**, **App
  Groups** (group id `group.com.foundermodeadvice.app.onesignal` will be
  created/managed by the EAS build for the OneSignal extension — if asked,
  allow it), **Sign in with Apple** (the app offers Apple login via
  Supabase/Lovable brokered OAuth; enable the capability so the entitlement
  is grantable). In-App Purchase is implicit.
- Do NOT enable anything else (no HealthKit, location, background modes
  beyond remote-notification which the build config manages).

## 3. App record (App Store Connect → Apps → +)
- Platform iOS · Name **Founder Mode Advice** (if taken, STOP → user picks
  fallback) · Primary language English (U.S.) · Bundle ID
  `com.foundermodeadvice.app` · SKU `FMA-IOS-001`.
- Full Access users only; confirm with user before granting anyone else.
- **Capture the numeric Apple ID of the created app record** (App
  Information → General) into the ledger — the repo needs it later for
  `native/eas.json` → `submit.production.ios.ascAppId`.

## 4. App Information / Version 1.0 metadata
Fill EXACTLY from the repo file `docs/app-store/APP_STORE_METADATA.md`
(the user can paste it to you; do not improvise copy):
- Subtitle, promotional text, description, keywords, support URL
  (https://foundermodeadvice.com/contact), marketing URL
  (https://foundermodeadvice.com), copyright `© 2026 Saint Marlo Labs LLC`.
- Privacy Policy URL: https://foundermodeadvice.com/privacy-policy
  (App Privacy section) and the user-privacy-choices/deletion URL
  https://foundermodeadvice.com/account-deletion where the form offers it.
- Categories: Business primary, Productivity secondary.
- License Agreement: standard Apple EULA (do not upload a custom one unless
  the user says so; Terms link stays in the description/metadata).
- Age rating: answer the live questionnaire honestly per the table in
  APP_STORE_METADATA.md (business app; no unrestricted web; AI-generated
  business content; invite-only sharing, no public UGC feed). Accept the
  computed rating — never tune answers to force one.
- App Privacy: enter the matrix from `docs/app-store/APP_PRIVACY_MATRIX.md`
  verbatim (Collected+Linked: email, name-if-OAuth, user content, user id,
  device id (push), purchases, product interaction; Tracking: NONE).
- Content rights: declare third-party content with rights/permissions ONLY
  after the user confirms counsel sign-off (see repo
  LEGAL_AND_POLICY_GAPS.md §1) — otherwise mark BLOCKED.
- Export compliance: app uses only standard/exempt encryption (HTTPS); the
  binary declares ITSAppUsesNonExemptEncryption=false.

## 5. App Review information
- Sign-in required: YES. Demo account: the USER creates the seeded reviewer
  account per `docs/app-store/APP_REVIEW_NOTES.md` and types the credentials
  into the form directly (never via chat).
- Contact: user's first/last name, phone, email (default
  CA@saintmarlolabs.com unless they specify otherwise).
- Notes: paste the review-notes block from APP_REVIEW_NOTES.md.

## 6. Subscriptions (Monetization → Subscriptions)
- Group: reuse-or-create reference name **Founder Mode Advice
  Subscriptions**; en-US group display name **Founder Mode Advice**.
- Products — CONFIRM WITH USER, THEN CREATE EXACTLY:
  1. `seed_monthly` · ref name "The C-Suite Monthly" · display "The
     C-Suite" · desc "20 analyses/mo, doc upload, 5 profiles" · 1 month ·
     US $9.99 · no intro offer/trial · group level 2.
  2. `series_z_monthly` · ref name "The Boardroom Monthly" · display "The
     Boardroom" · desc "Unlimited analyses, AI chat, sharing" · 1 month ·
     US $19.99 · no intro offer/trial · group level 1.
- Availability: per the user's confirmed territory decision (repo
  recommendation: all territories; EU only if §1 DSA is complete). Pricing
  in other territories: Apple-generated from the US base unless the user
  overrides.
- Tax category: default software/SaaS unless the user's accountant says
  otherwise (record choice).
- Localization review notes + REVIEW SCREENSHOT per product: the paywall
  screenshot comes from a real build (repo SCREENSHOT_BRIEF.md §Paywall) —
  USER-ASSISTED UPLOAD (browser cannot attach files): tell the user which
  product screen is open, they upload, you verify the thumbnail appears.
- **Attach both products to the 1.0 version submission** (Version page →
  In-App Purchases and Subscriptions section) — first subscriptions must
  ride the app submission.
- App Store Server Notifications (App Information → App Store Server
  Notifications): set BOTH Production and Sandbox URLs to the values from
  the RevenueCat console (RevenueCat prompt step 7 recorded them). V2.

## 7. Build & TestFlight
- The build arrives via `eas submit` run by the user (or Expo prompt §3).
  Once processing completes: TestFlight → manage missing compliance (should
  auto-pass via the plist declaration), add internal testers (user's team),
  verify the build installs.
- Version page → select that build. Release option: **Manually release this
  version**.

## 8. Final pre-submit verification sweep
Re-open and verify against the repo values: name/subtitle/keywords byte
counts, all four URLs resolve (open each), privacy answers match the
matrix, both subscriptions "Ready to Submit", screenshots present for
6.9" iPhone and 13" iPad, demo account works (user signs into it once in a
private window), review notes present. Ledger: every row DONE or explicitly
BLOCKED/USER ACTION REQUIRED. **Do NOT press Submit for Review** — report
ready-state and stop; submission is a user decision.

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| 1 Membership/agreements/tax/banking | | |
| 2 Identifier/capabilities | | |
| 3 App record + Apple ID captured | ✅ | 6799753048 |
| 4 Metadata/privacy/rating/rights/export | | |
| 5 Review info + demo account | | |
| 6 Subscription group/products/notifications | | |
| 7 Build/TestFlight | | |
| 8 Verification sweep | | |
