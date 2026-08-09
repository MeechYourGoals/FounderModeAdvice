# App Privacy matrix — counsel/owner review draft

Tracking is **No** unless PostHog/OneSignal configuration or vendor contracts establish cross-company tracking. ATT is not included and must not be added unless tracking is actually performed.

| Apple data type | Collected | Linked | Tracking | Purpose / source / vendor | Retention and deletion |
|---|---|---|---|---|---|
| Email address, name | Yes | Yes | No | Account/auth; Supabase, Google/Apple auth | Account lifetime; deletion flow, provider records may remain |
| User ID | Yes | Yes | No | Supabase UUID; RevenueCat, OneSignal, PostHog | Account/vendor policy; RevenueCat transaction records retained |
| Purchases | Yes | Yes | No | Entitlement/status; Apple, RevenueCat, Paddle/legacy Stripe | Financial/legal retention; account deletion does not cancel subscription |
| Product interaction | Yes | Yes | No | Feature events; Supabase and PostHog installed-app analytics | Policy currently says diagnostics up to 12 months; externally verify |
| Other user content | Yes | Yes | No | URLs, documents, screenshots, decks, profiles, prompts, transcripts, memos, Q&A, notes/comments; Supabase/Lovable/Google/Supadata | Extracted content persists; raw uploads intended temporary; deletion inventory incomplete |
| Contacts | Conditional | Yes | No | Invitee email entered for collaboration | Until invite/collaboration deletion; cleanup incomplete |
| Device ID / push token | Conditional | Yes | No | Optional notifications; OneSignal/APNs | Until opt-out/account deletion/vendor expiry; verify dashboard |
| Diagnostics | Possible | Possibly | No | native/web logs and vendor SDK diagnostics | Verify SDK dashboards/contracts before selecting subtypes |
| IP address / coarse location | Yes | Possibly | No | Network/security, hosting and vendors; country may derive from transactions | Vendor/log retention externally verify |
| Search history | Yes | Yes | No | In-app queries/search and AI questions in Supabase | Account/content lifetime; deletion flow |
| Advertising data | No | No | No | No advertising SDK found | N/A |
| Precise location, health, fitness, financial/payment credentials, sensitive info | No intentional collection | — | No | Not required by shipping behavior; user may voluntarily put such data in submitted content | Treat voluntary content as Other User Content |

Do not submit this matrix until SDK privacy manifests, PostHog configuration, vendor contracts, deployed behavior and final archive are inspected.
