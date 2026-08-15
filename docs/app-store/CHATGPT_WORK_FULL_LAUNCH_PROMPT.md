# ChatGPT Work Prompt — Full Launch Orchestration (authenticated browser)

Use this when running the ENTIRE console sequence in one session (Apple +
RevenueCat + Expo/EAS + Supabase + OneSignal). It sequences the two focused
prompts and adds the Expo/Supabase/OneSignal glue. Copy everything below the
line into ChatGPT Work with browser access.

---

You are the launch operator for **Founder Mode Advice** iOS 1.0
(bundle `com.foundermodeadvice.app`, Saint Marlo Labs LLC, web origin
https://foundermodeadvice.com). Execute the phases IN ORDER; each phase's
outputs feed the next. Maintain ONE cumulative ledger across all phases
(DONE / BLOCKED / USER ACTION REQUIRED / FAILED + evidence). Global rules:

- Inspect existing records before creating anything, in every console.
  Reconcile bundle IDs, app names, team/ownership, SKUs, product IDs across
  Apple ↔ RevenueCat ↔ Expo before any create action; mismatches STOP the
  step (USER ACTION REQUIRED with a reconciliation table).
- Never create duplicates of: apps, identifiers, subscription groups,
  products, entitlements, offerings, webhooks, API keys, or EAS projects.
- Never reveal or transcribe: passwords, 2FA codes, .p8/.p12 contents,
  private/secret API keys, banking or tax data, demo-account passwords.
  Fields like that are typed by the USER (hand off → they confirm → you
  verify the masked/saved state).
- The browser cannot upload files. Every file upload (.p8 keys, screenshots,
  review screenshots) is a user-assisted checkpoint: state the open screen +
  exact file, wait for "done", verify, continue.
- PAUSE for explicit user confirmation before: immutable IDs (bundle ID,
  SKU, product IDs), accepting legal agreements, tax/banking entry,
  generating/uploading keys, finalizing prices/trials/regions/availability,
  any plan purchase/upgrade (including Expo/RevenueCat/OneSignal paid
  tiers), submitting to App Review, releasing publicly.
- After every phase: re-open each saved screen and verify values; append
  "verified" notes to the ledger.

## Phase 0 — Preflight reconciliation (read-only)
1. Apple Developer → Identifiers: does `com.foundermodeadvice.app` exist and
   under which team? App Store Connect → Apps: any existing "Founder Mode
   Advice" record, its SKU and Apple ID?
2. RevenueCat: existing projects/apps with this bundle id? Existing
   entitlements/offerings/products?
3. expo.dev: which account/organization will own the project? Any existing
   project `founder-mode-advice`?
4. Supabase (dashboard, project `iffcuueutmsusgdfekvm`): confirm the edge
   functions `revenuecat-webhook`, `sync-revenuecat-subscription`,
   `delete-user-account` are deployed at their latest versions, and which of
   these secrets exist (names only): REVENUECAT_API_KEY,
   REVENUECAT_WEBHOOK_AUTH, SUPADATA_API_KEY, LOVABLE_API_KEY, CRON_SECRET,
   ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY, PADDLE_LIVE_API_KEY,
   PAYMENTS_LIVE_WEBHOOK_SECRET.
5. OneSignal: existing app for Founder Mode Advice? iOS (APNs) configured?
6. Produce the reconciliation table; get the user's GO before Phase 1.

## Phase 1 — Apple Developer / App Store Connect
Execute `docs/app-store/CHATGPT_WORK_APP_STORE_CONNECT_PROMPT.md` sections
1–6 (membership → identifier → app record → metadata/privacy/rating →
review info → subscriptions + server-notification URLs). Carry its pause
points and ledger rows into this session's ledger. Outputs needed later:
**numeric ascAppId**, subscription products live in ASC.

## Phase 2 — RevenueCat
Execute `docs/app-store/CHATGPT_WORK_REVENUECAT_PROMPT.md` fully. Outputs:
public SDK key `appl_…` (ledger), Apple Server Notification URLs (pasted
back into ASC — verify now), webhook pointing at the Supabase function with
the Authorization secret set on both sides (user types the secret in both
consoles; you verify save-state only).

## Phase 3 — Supabase & OneSignal glue
1. Supabase → Edge Functions → secrets: user sets/confirms
   REVENUECAT_API_KEY and REVENUECAT_WEBHOOK_AUTH (values typed by user).
   Verify the three functions above show a deployment newer than the repo
   branch merge; if not, USER ACTION REQUIRED: run
   `supabase functions deploy revenuecat-webhook sync-revenuecat-subscription delete-user-account`.
2. OneSignal: reuse-or-create the app; iOS platform configured with an APNs
   .p8 (user-assisted upload); record the OneSignal App ID (public) in the
   ledger; user sets Supabase secrets ONESIGNAL_APP_ID/REST key and the EAS
   env var FMA_ONESIGNAL_APP_ID.
3. Verify the scheduled daily-prompt job (if any) sends header
   `x-cron-secret` matching CRON_SECRET; otherwise mark BLOCKED with the
   fix (the old cron snippet lacked the header).

## Phase 4 — Expo / EAS
1. expo.dev: confirm the owner account/org. The project link itself is a
   CLI step — USER ACTION REQUIRED: run `cd native && eas init` with that
   account and commit the `extra.eas.projectId` change; you verify the
   project appears on expo.dev afterwards.
2. expo.dev → project → Environment variables: create for environments
   development/preview/production —
   `FMA_REVENUECAT_IOS_API_KEY` = the `appl_…` key (plain visibility),
   `FMA_ONESIGNAL_APP_ID` = OneSignal id; production gets NO `FMA_WEB_URL`
   override. (Values are public-class; you may paste these two.)
3. Credentials: on the first `eas build`, EAS manages the distribution
   certificate/profile and push key — the USER runs
   `eas build --profile production --platform ios`
   and, when prompted, lets EAS handle credentials. You verify the build
   reaches "finished" on expo.dev. (Do NOT trigger paid builds yourself —
   builds consume the user's EAS plan; get their GO first.)
4. Submission: USER runs `eas submit --platform ios` (or you guide the ASC
   upload if they use Transporter). The **ascAppId** `6797082499` is already
   recorded in `native/eas.json` → `submit.production.ios.ascAppId` (no further
   repo change needed).

## Phase 5 — Metadata, screenshots, TestFlight, review-ready
1. Screenshots: user produces the authenticated frames + paywall review
   shot per `docs/app-store/SCREENSHOT_BRIEF.md`; user-assisted upload into
   ASC (6.9" iPhone + 13" iPad sets; review screenshot on each subscription
   product). Verify thumbnails.
2. TestFlight: build selected on the 1.0 version; internal testers added;
   user confirms the FINAL TEST GATE (repo RELEASE_CHECKLIST.md) passes on
   the uploaded binary — record their confirmation per gate step group.
3. Run the ASC prompt's §8 verification sweep. Ledger must show every row
   DONE or explicitly BLOCKED/USER ACTION REQUIRED.
4. STOP before "Submit for Review" and before any release action — report
   the ready state; submission and release are the user's decisions.

## Cumulative ledger

| Phase.Step | Console | Status | Evidence |
| --- | --- | --- | --- |
