# App Review Notes (paste into App Store Connect → App Review Information)

## Demo account (REQUIRED — currently a blocker)

```
Email:    [create fresh reviewer account before submission — e.g. a dedicated
           mailbox the team controls; never a personal account]
Password: [set in App Store Connect only — do not commit anywhere]
```

Demo-account requirements (durable across review cycles):
- Email/password login (no 2FA/email-confirmation friction — confirm the
  account once before submission).
- Subscription tier: FREE (so reviewers can exercise the paywall and a real
  sandbox purchase).
- Pre-seeded content so value is visible without waiting on AI runs:
  at least 3 analyzed sources (e.g. a YouTube founder interview, an article,
  and an uploaded sample PDF created from fictional data), 1 folder with 2
  analyses, 2 bookmarked insights. Keep this account permanently; re-verify
  before every submission.

## Notes to the reviewer

```
Founder Mode Advice turns founder/investor/operator content (public links or
the user's own uploaded documents) into "operating memos": lessons, risks,
action items, and advice tailored to the user's company profile, plus
follow-up Q&A and an organized library.

SIGN-IN: Use the demo account above (email/password). Sign in with Apple is a
native AuthenticationServices sheet in the store binary (not a WebView page).
Google sign-in is also offered.

CORE FLOW (2–3 minutes): Home → paste a public YouTube/article link into
"New analysis" → Analyze. A memo is generated in about a minute (the demo
account also has pre-analyzed sources if you prefer not to wait). Open any
analysis to see lessons/risks/actions grounded in the transcript.

AI DISCLOSURE: The first analysis shows a consent dialog naming the AI
processors (Google Gemini via our gateway; Supadata for transcripts). This is
also covered in Privacy Policy §6/§10.

SUBSCRIPTIONS (RevenueCat + StoreKit): Account tab → "Upgrade Your Plan" →
selecting a plan opens the native paywall. Each plan shows its name, Monthly
length, localized StoreKit price, the features it unlocks, “Auto-renews until
canceled,” how to cancel (Settings → Subscriptions, or one tap in in-app
Settings), and Privacy Policy + Terms of Use (EULA) links — all before
Purchase. Two auto-renewing monthly products: The C-Suite (seed_monthly,
$9.99) and The Boardroom (series_z_monthly, $19.99). Restore Purchases is on
the same screen. Manage Subscription opens the native subscription-management
surface. Server-side entitlement verification gates paid AI features.

ACCOUNT DELETION: Account tab → Delete Account (confirmation dialog includes
a Manage Subscription shortcut and explains Apple billing is cancelled
separately). Deletion is immediate and removes auth identity, content,
uploads, and dependent records. Also documented at
https://foundermodeadvice.com/account-deletion.

PUSH: Optional. No permission prompt at launch — it appears only when the
user enables a notification preference in Settings → Notifications.

NATIVE VALUE BEYOND THE WEBSITE: native Apple/Google sign-in flow, native
RevenueCat paywall + StoreKit billing, Restore Purchases, native share
sheet, haptics throughout, safe-area/tab-bar app chrome, opt-in push with
the daily founder prompt, offline retry screen, deep links
(com.foundermodeadvice.app:// and https://foundermodeadvice.com universal
links once AASA is deployed).

CONTENT: The app analyzes public content the user submits and private
documents they own. Output is informational business advice grounded in
those sources; it does not claim endorsement by the people featured. No UGC
feed exists — sharing is invite-only between accounts.

Support: CA@saintmarlolabs.com
```

## Reviewer path (step-by-step, matches the FINAL TEST GATE)

1. Cold launch → auth screen (no marketing detour in app context).
2. Sign in with demo account.
3. Home: paste `https://www.youtube.com/watch?v=<any public founder talk>` →
   consent dialog (first run) → Analyze → memo appears; or open a pre-seeded
   analysis.
4. Open analysis → lessons/risks/actions; try follow-up Q&A on a Boardroom
   feature to see the upsell path (free account → paywall).
5. Account → Upgrade Your Plan → native paywall shows both monthly plans
   with localized prices, per-plan features, auto-renew/cancel copy, and
   Privacy/Terms links above Purchase → sandbox-purchase The C-Suite →
   tier badge updates, document upload unlocks.
6. Account → Restore Purchases (idempotent, reports success).
7. Account → Manage Subscription → native management surface opens.
8. Account → Delete Account → confirmation (Manage Subscription shortcut) →
   deletion signs out and removes data.

## Known review-sensitive points, pre-answered

- **Guideline 4.2 (minimum functionality):** the app is a WebView-based
  hybrid with the native capabilities listed above (billing, sign-in, push,
  haptics, share, deep links). This is disclosed transparently; the memo
  library, uploads, and Q&A constitute the app's own utility. See
  BLOCKERS.md §4.2 for the honest risk assessment — do not claim the app is
  fully native if asked.
- **Guideline 3.1.1:** all digital-goods purchases inside the app use Apple
  IAP. Web (Paddle) checkout is hard-blocked in app contexts
  (`getStripeCheckoutUrl`/`getStripePortalUrl` return null in native, the
  Paddle overlay is web-only, and no external purchase links are shown).
- **Guideline 5.1.1(v):** account deletion is in-app, immediate, and covers
  hosted data; payment-processor tax records are retained per law (disclosed).
- **AI (5.1.1/5.1.2):** consent dialog before first send; vendors named.
```
