# Release checklist

Statuses: PASS / FAIL / BLOCKED / NOT TESTED / EXTERNAL SETUP REQUIRED.

## Repository gate
- [x] PASS npm lockfiles and Expo managed project identified.
- [x] PASS production host + RevenueCat Apple-key/Test-Store guard.
- [x] PASS EAS dev/preview/production environment names, remote build number, production auto-increment.
- [x] PASS placeholder ASC app ID removed; no fake IDs committed.
- [x] PASS 1024×1024 RGB/no-alpha icon checked.
- [ ] FAIL AI/analytics consent and complete deletion.
- [ ] FAIL WebView/minimum-functionality risk accepted or remediated.
- [ ] BLOCKED commercial mapping confirmation.

## Required commands
- [x] PASS `npm ci`
- [ ] FAIL `npm run lint` — 120 pre-existing errors across the repository; changed-file lint passes.
- [x] PASS `npx tsc -b --noEmit`
- [x] PASS `npm run build` (bundle-size warnings only)
- [x] PASS `npm run test:subscription-mapping`
- [ ] BLOCKED `npm run build:verify` — local build passed; deployed-host checks could not reach the network.
- [x] PASS `npm --prefix native ci`
- [ ] BLOCKED `cd native && npx expo install --fix` — registry/proxy returned HTTP 403 after installation.
- [ ] BLOCKED `cd native && npx expo-doctor@latest` — registry/proxy returned HTTP 403.
- [x] PASS `cd native && npx expo config --type public --json`
- [x] PASS `cd native && npx expo config --type introspect --json`
- [ ] disposable `npx expo prebuild --platform ios --no-install` and native artifact inspection

## TestFlight gate
Execute all 22 user-specified scenarios: fresh cold launch without Metro; full auth/session lifecycle; AI consent/onboarding; every source; success/failure/timeout/retry; Q&A; library/search/edit/delete/export/share; free gating; StoreKit monthly/annual only if confirmed; cancel/success/relaunch/second-device/reinstall/restore/manage; renewal/expiry/grace/revocation; offline/slow/missing offering/config/backend; deletion; three device classes; production-secret scan; repeat on uploaded TestFlight build. Record build number/device/iOS/results. None are currently tested.

## Submission safety
Pause before immutable identifiers, agreements, finance/tax, keys, prices/trials/regions, paid actions, review submission or public release. A human must upload all screenshots and `.p8` files.
