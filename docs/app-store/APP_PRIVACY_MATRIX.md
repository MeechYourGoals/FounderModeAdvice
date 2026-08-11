# App Privacy Matrix (App Store Connect "App Privacy" answers)

Basis: actual code paths audited 2026-08-09 — Supabase (auth/db/storage),
Lovable AI gateway → Google Gemini, Supadata (transcripts), RevenueCat (IAP),
Paddle (web billing — not used inside the iOS app), OneSignal (push, opt-in),
PostHog (installed-app analytics, explicit events only, autocapture/session
recording disabled in `src/services/posthogLoader.ts`). No ads SDK, no
cross-app tracking, no data sold/shared with brokers.

**Global answers:** Data collected: YES · Data used to track you: **NO** (no
ATT prompt, IDFA unused).

| Apple data type | Collected? | Linked to identity? | Tracking? | Purpose(s) | Source / vendor | Retention | Deleted on account deletion? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Contact Info → Email Address | Yes | Yes | No | App Functionality (account) | Supabase Auth (email/password, Google, Apple sign-in) | Life of account | Yes — auth user deleted |
| Contact Info → Name | Only if provided by OAuth provider | Yes | No | App Functionality | Google/Apple via Supabase | Life of account | Yes |
| User Content → Other User Content (submitted links, uploaded documents, transcripts, startup profiles, chat prompts, memos, comments) | Yes | Yes | No | App Functionality | Supabase (storage/db); processed transiently by Lovable AI gateway → Google Gemini; public links sent to Supadata for transcript retrieval | Life of account; uploaded source files deleted right after analysis | Yes — 20+ tables + 3 storage buckets (see delete-user-account) |
| User Content → Photos or Videos | Only images the user explicitly uploads as sources | Yes | No | App Functionality | Supabase storage → AI transcription | Deleted after analysis | Yes |
| Identifiers → User ID | Yes (Supabase UUID; same value used as RevenueCat app user ID, OneSignal external ID, PostHog distinct ID) | Yes | No | App Functionality, Analytics | Supabase, RevenueCat, OneSignal, PostHog | Life of account | Yes (Supabase); RevenueCat retains transaction records per its policy |
| Identifiers → Device ID | Push token/device record only if the user opts in to notifications | Yes (mapped to user) | No | App Functionality (push) | OneSignal | Until push opt-out / account deletion | OneSignal record orphaned on deletion (external id unlinked); document in policy |
| Purchases → Purchase History | Yes (subscription state) | Yes | No | App Functionality | Apple StoreKit → RevenueCat | Per Apple/RevenueCat policy | Apple/RevenueCat retain tax/audit records (disclosed in deletion page) |
| Usage Data → Product Interaction | Yes (explicit screen/feature events; no autocapture, no session replay) | Yes (identified with user id) | No | Analytics | PostHog (US cloud) | Per PostHog project retention | Not automatically — flagged in LEGAL_AND_POLICY_GAPS (add PostHog deletion to offboarding runbook) |
| Diagnostics → Crash Data | No | — | — | — | (no crash SDK present) | — | — |
| Diagnostics → Performance Data | No | — | — | — | — | — | — |
| Location | No | — | — | — | — | — | — |
| Contacts / Messages / Health / Financial info / Browsing history / Search history (outside app) | No | — | — | — | — | — | — |

## Per-vendor notes for the ASC form

- **Google Gemini (via Lovable AI gateway)** — receives user-submitted
  content transiently to generate results; not used for tracking; disclose
  under User Content purposes (App Functionality). Named in the privacy
  policy §6 and in the in-app AI consent dialog.
- **Supadata** — receives the public URL the user submitted (no account
  data) to return a transcript.
- **RevenueCat** — app user id + StoreKit receipt data; "Purchases" row.
- **OneSignal** — only after the user enables a notification preference
  (permission prompt is user-initiated, not on launch).
- **PostHog** — identified analytics; if you prefer to declare analytics as
  not linked, PostHog would have to be switched to anonymous ids — code
  currently identifies with the user id, so answer LINKED.
- **Paddle** — web checkout only; never invoked inside the iOS app; not an
  iOS data collector (do not list).

## Consistency requirements

These answers must match: privacy policy §2/§6/§8 (they do, as updated
2026-08-09), the in-app AI consent dialog, the account-deletion page, and the
review notes. If any vendor is added/removed, update all five together.
