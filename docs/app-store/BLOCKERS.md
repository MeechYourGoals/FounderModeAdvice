# Release blockers

## Product/commercial decision — blocking question

Confirm exactly one source-of-truth mapping before any immutable records are created:

1. **Two monthly tiers as currently represented:** `seed_monthly` / The C-Suite / USD 9.99 monthly and `series_z_monthly` / The Boardroom / USD 19.99 monthly; confirm one entitlement per tier or a single top-tier entitlement; **or**
2. **A revised mapping:** provide exact tier names, Apple product IDs, durations, price points, trials, regions, RevenueCat entitlement/offering/package IDs, and whether annual products are in v1.

The repository does not establish trials, annual products, regions, tax category, Apple subscription group name, SKU, Apple numeric app ID, Apple team, EAS owner/project ID, or availability. None were invented.

## Must-fix repository/product blockers

- Material Guideline 4.2 risk: core product is a thin WebView and has not been reviewed on device as a genuine iPad experience.
- Add explicit, versioned consent before sending user documents, URLs, transcripts, company context or prompts to Lovable AI Gateway/Google Gemini/Supadata; provide a revoke/data-choice control.
- Make PostHog consent behavior match policy (default off until opt-in, or obtain counsel-approved lawful-basis copy and choice).
- Complete deletion inventory including `source-uploads`, collaboration/favorites/invites, AI context and retained vendor records; require recent reauthentication; place Manage Subscription before deletion.
- Reconcile Terms/Refund/Privacy for Paddle web purchases and Apple/RevenueCat native purchases; replace dynamic “Last Updated” dates after counsel approval.
- Replace embedded Google WebView OAuth with a supported system authentication session or pass real-device TestFlight verification with accepted residual risk.
- Implement lifecycle synchronization for renewal/revocation independent of client launch (authenticated RevenueCat webhook or scheduled server verification).

## External setup required

EAS project linkage/owner; Apple team/membership/agreements/tax/banking/DSA; bundle/app-record reconciliation; certificates/profiles; App Store products; RevenueCat project and Apple credentials; EAS public environment values; Supabase server secret; AASA verification; demo account; privacy/age/export/content-rights forms; screenshot uploads; TestFlight testing.
