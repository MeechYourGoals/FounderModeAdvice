# Legal & Policy Gaps (counsel-review drafts — not legal certification)

Changes marked ✅ were applied to the live legal pages in this release branch
(they deploy with the website). Items marked ⚠️ need owner/counsel action.

## Applied in this branch ✅

1. **Privacy Policy** (`/privacy-policy`)
   - Named the actual AI processors (Google Gemini via Lovable AI gateway;
     Supadata for transcript retrieval) instead of generic "AI providers".
   - Added PostHog (installed-app analytics, explicit events, no session
     replay) — closing the TODO flagged in DESPIA_READINESS §10.
   - Added Apple/Google as in-app billing processors; clarified RevenueCat's
     role and data (app user id + purchase state, no card data).
   - Sign-in providers list now includes Apple.
   - §10 now describes the in-app AI consent moment and how to withdraw.
   - Replaced the always-today "Last Updated: {new Date()}" bug with a real
     date (all four legal pages) — the old behavior misrepresented when the
     policies actually changed.
2. **Terms of Service** (`/terms-of-service`)
   - Payments section now covers BOTH rails: Apple/Google IAP (auto-renewal,
     device-level cancellation, Apple/Google as billing parties) and Paddle
     as Merchant of Record for web orders only.
3. **Refund Policy** (`/refund-policy`)
   - Scoped the 30-day money-back guarantee to WEB purchases (we cannot
     refund Apple-billed purchases); added an Apple/Google section pointing
     to reportaproblem.apple.com; cancellation paths per platform.
4. **Account deletion**
   - `delete-user-account` now also purges the `source-uploads` bucket,
     `user_favorites`, `favorite_collections`, Paddle `subscriptions` audit
     rows, analysis grants/invites, and discussion messages — aligning the
     backend with the "we remove your data" claims made on
     `/account-deletion` and to Apple.
   - Deletion dialog explains Apple billing survives deletion and offers the
     Manage Subscription route first.

## Requires owner / counsel ⚠️

1. **Transcript sourcing & platform terms.** Transcripts of public URLs are
   fetched through Supadata (YouTube, TikTok, Instagram, X, Vimeo, LinkedIn,
   podcasts). The app stores transcript text and derives memos for the
   submitting user's private use; it does not redistribute source media.
   Counsel should bless: (a) the fair-use/derived-work posture for memos,
   (b) reliance on Supadata's compliance with platform terms (YouTube TOS
   §III prohibits unauthorized scraping — risk sits primarily with the
   provider but reflects on the app), (c) the App Store "content rights"
   declaration wording. A copyright contact (CA@saintmarlolabs.com, subject
   "Copyright") is now in Terms §6; counsel should still bless the posture.
2. **PostHog data deletion.** ✅ In-app `delete-user-account` now calls PostHog
   `delete_persons` when `POSTHOG_PROJECT_ID` + `POSTHOG_PERSONAL_API_KEY` are
   set as edge-function secrets. If those secrets are missing, deletion of the
   Supabase account still succeeds and PostHog erasure is reported as skipped.
3. **OneSignal device records.** ✅ Same function now `DELETE`s the OneSignal
   user by external id (`ONESIGNAL_APP_ID` + `ONESIGNAL_REST_API_KEY`). 404 is
   treated as already-gone.
4. **Support email domain.** All legal pages and the app use
   `CA@saintmarlolabs.com`. Confirm that mailbox is monitored and decide
   whether to introduce support@foundermodeadvice.com everywhere instead
   (the one stray reference to it in the error boundary was aligned to
   CA@saintmarlolabs.com in this branch).
5. **Founder bypass.** `FOUNDER_EMAILS = ['ccamechi@gmail.com']` grants
   unlimited paid features in two edge functions, keyed to a personal Gmail.
   Consider migrating to the existing `user_roles`/`has_role` mechanism.
   (Left unchanged — behavior/revenue decision.)
6. **EU DSA trader status.** If distributing in the EU, App Store Connect
   requires trader declaration (address + contact published on the store
   page). Saint Marlo Labs LLC's publishable address/phone are not in the
   repo — have them ready before selecting EU territories.
7. **Google OAuth inside the WebView.** Works today via a Safari-like user
   agent (the same mechanism the previous Despia wrapper used), but Google
   officially discourages embedded-WebView OAuth and could tighten
   enforcement. Mitigation path (system-browser auth session) is documented
   in native/README.md as a deliberate follow-up. Verify Google login on
   real hardware every TestFlight round. Sign in with Apple is native in
   EAS builds and does not go through the WebView; email/password is unaffected.
8. **Old marketing screenshots.** Legacy files under
   `app-store-assets/screenshots/` (iphone-6.9-01-home etc.) predate the
   current product and pipeline; do not submit them. The raw-web-captures
   folder + brief supersede.
