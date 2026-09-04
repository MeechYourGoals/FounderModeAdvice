# Marketing fixes — draft only

Date prepared: 2026-09-04  
Status: **Do not publish from this branch.** These are proposed copy/compliance changes only.

## 1. Flock disclosure or removal

The repository contains no source-code reference to “Flock.” That does not prove the compiled iOS binary is free of a vendor SDK because the native wrapper/build service can add dependencies outside this export.

Preferred action: remove Flock from the native build if no shipped Founder Mode Advice feature requires it. Before removal, inspect the Xcode archive privacy report, linked frameworks, `PrivacyInfo.xcprivacy` manifests, and the wrapper provider's SDK list.

If Flock is required, obtain the vendor's exact legal entity, product purpose, data categories, retention, subprocessors, and privacy-policy URL. Then add a third-party-services paragraph using this draft structure only after those facts are verified:

> **Flock ([verified legal entity])** — used for [verified product purpose]. Depending on your settings and device permissions, it processes [verified data categories]. [Verified retention/control statement]. Learn more in [verified privacy-policy link].

Do not publish a guessed entity, purpose, or data list.

## 2. App Store availability

The current visual badge says “Download on the App Store,” while only its accessibility label says “coming soon.” That still implies a live listing to sighted visitors.

Draft replacement before listing:

- Eyebrow: `iPhone app`
- Main line: `Coming soon`
- No App Store link and no official “Download on the App Store” artwork.

After Apple confirms the public listing, replace it with Apple's official linked badge and the verified product URL.

## 3. Entity and assurance claims

- Keep the existing Saint Marlo Labs LLC / Delaware entity wording consistent. Do not reopen or restyle it in this pass.
- Do not add HIPAA, SOC 2, “bank-grade,” “military-grade,” or equivalent assurance claims without completed, current evidence and counsel-approved wording.
- PostHog is already named in the product's disclosures; retain that disclosure and reconcile it against the final App Privacy answers.
