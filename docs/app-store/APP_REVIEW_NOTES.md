# App Review notes — paste only after blocked items pass

Founder Mode Advice turns user-selected founder/operator material into structured, source-grounded operating memos. It supports email/password, Google and Apple sign-in. Core data is private to the account except content the user explicitly shares with invitees.

**Demo account:** `[durable review email]` / `[password entered only in App Store Connect]`. Credentials are not stored in this repository.

**Reviewer path:** launch → sign in → open the seeded fictional “Northwind” profile → Library → open the seeded memo → review Lessons/Risks/Next Moves → open follow-up Q&A → Account → Subscription → open paywall → cancel without purchase → Restore Purchases → Manage Subscription → Account & Data → Delete Account (do not complete unless using a disposable review user).

To create a memo: Home → add a rights-cleared supported source → choose Northwind → acknowledge AI processing disclosure → Analyze → wait for memo → save/share. For purchase testing, use Apple sandbox; two products must not be named here until mapping is confirmed. The RevenueCat paywall shows StoreKit-localized price and disclosures. Restore and management are visible in Account.

Native integrations include Apple IAP/RevenueCat, share sheet, haptics, deep links, safe-area/status-bar behavior and optional notifications. The core interface is hosted in a WebView; do not claim otherwise. A network connection is required for generation and most core content.

Privacy: https://foundermodeadvice.com/privacy-policy
Terms: https://foundermodeadvice.com/terms-of-service
Deletion: https://foundermodeadvice.com/account-deletion
Support: https://foundermodeadvice.com/contact

**Before pasting:** validate AI consent, seeded data, every path, IAP product names, restore, deletion, offline wording and TestFlight build. No approval is guaranteed.
