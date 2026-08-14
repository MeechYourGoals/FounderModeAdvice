# 2b — App Store Connect return visit (Server Notifications)

Use this **after** the RevenueCat script, still signed into App Store Connect.

**Start URL:** https://appstoreconnect.apple.com/apps

Paste the two URLs from RevenueCat CAPTURE first:

RC_APPLE_SERVER_NOTIFICATIONS_PRODUCTION=
RC_APPLE_SERVER_NOTIFICATIONS_SANDBOX=

--- COPY FROM HERE ---

You are on App Store Connect for Founder Mode Advice. Open the app → App Information → App Store Server Notifications.

Set version **V2**.
- Production URL: the RevenueCat production Apple Server Notifications URL I pasted above
- Sandbox URL: the RevenueCat sandbox Apple Server Notifications URL I pasted above

Save. Re-open and verify both fields. Do not submit for review.

CAPTURE:
```
ASC_SERVER_NOTIFICATIONS_V2_SET=yes/no
```
