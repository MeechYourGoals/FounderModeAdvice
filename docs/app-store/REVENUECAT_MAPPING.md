# RevenueCat mapping (unconfirmed commercial draft)

| Layer | Repository value | Status |
|---|---|---|
| App | Founder Mode Advice / `com.foundermodeadvice.app` | Confirm in Apple + RevenueCat |
| App User ID | authenticated Supabase `user.id` UUID | Confirmed implementation; never email |
| Products | `seed_monthly`, `series_z_monthly` | UNCONFIRMED; pause before creation |
| Plans | The C-Suite, The Boardroom | Existing product copy |
| Durations | monthly | Existing identifiers/copy; not externally confirmed |
| Prices | USD 9.99, USD 19.99 | Hardcoded web copy only; UNCONFIRMED for Apple |
| Trial | none established | BLOCKED |
| Regions | none established | BLOCKED |
| Entitlements | `Founder Mode Advisor Pro`, `founder_mode_advisor_pro`, legacy `seed_subscription`, `series_z_subscription` | Conflicting aliases; choose exact mapping |
| Offering | `default` | UNCONFIRMED |
| Packages/paywall | dashboard-managed RevenueCat packages/paywall | Configure only after confirmation |
| Restore | native restore; success only if active entitlement returned | Implemented; sandbox NOT TESTED |
| Management | RevenueCat Customer Center / Apple management URL | Implemented; NOT TESTED |
| Backend | `sync-revenuecat-subscription` validates authenticated UUID using server secret and upserts tier | Present; webhook lifecycle gap |
| Web coexistence | Paddle current, Stripe legacy; native checkout suppressed | Requires account transfer/access policy test |

Native plan cards do not display hardcoded amounts; the RevenueCat paywall must show StoreKit-localized full price, billing period, renewal, trial (if any), cancellation, Terms, Privacy and Restore. Public SDK key variable: `FMA_REVENUECAT_IOS_API_KEY` (`appl_…`, embedded/public). Server secret: `REVENUECAT_API_KEY` in Supabase only.
