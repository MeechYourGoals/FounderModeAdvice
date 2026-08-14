# Agentic browser scripts — iOS launch consoles

Copy **one script at a time** into ChatGPT / Claude / Perplexity’s browser
agent **after you are already signed in** on that site. Each file is
self-contained (no repo needed).

## How to use

1. Open the **Start URL** for that script and log in with your credentials
   (2FA stays with you — never paste codes into the agent).
2. Copy everything below the `--- COPY FROM HERE ---` line in that file.
3. Paste it into the browser agent and let it run.
4. When it says **USER ACTION REQUIRED**, you type the secret / upload the
   file / confirm an immutable create. Then tell it to continue.
5. At the end it prints a **CAPTURE** block. Paste those values into the
   next script’s “Values from previous consoles” section.

## Run order (do not skip)

Dependencies: Apple IDs → App Store Connect products → RevenueCat import →
ASC notification URLs. OneSignal + PostHog before Supabase so those secrets
exist when you fill Edge Function secrets. Expo last among consoles except
Lovable (Team ID for AASA can be done anytime after Apple Developer).

| # | Website | Start signed-in at | Script |
| --- | --- | --- | --- |
| 1 | Apple Developer | https://developer.apple.com/account | `01-apple-developer.md` |
| 2 | App Store Connect | https://appstoreconnect.apple.com/apps | `02-app-store-connect.md` |
| 3 | RevenueCat | https://app.revenuecat.com | `03-revenuecat.md` |
| 4 | App Store Connect (return — Server Notifications) | https://appstoreconnect.apple.com/apps | `02b-asc-server-notifications.md` |
| 5 | OneSignal | https://dashboard.onesignal.com | `05-onesignal.md` |
| 6 | PostHog | https://us.posthog.com | `07-posthog.md` |
| 7 | Supabase | https://supabase.com/dashboard/project/iffcuueutmsusgdfekvm | `04-supabase.md` |
| 8 | Expo / EAS | https://expo.dev | `06-expo-eas.md` |
| 9 | Lovable (web env) | https://lovable.dev/projects/3d30aa39-abcb-406b-9441-e7a7f14b5734 | `08-lovable-web-env.md` |

CLI you still run locally after #8 (the browser cannot): `cd native && eas init`, `eas build`, `eas submit`. The Expo script tells you exactly when.
