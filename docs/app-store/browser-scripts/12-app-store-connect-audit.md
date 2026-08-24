# 12 — App Store Connect (audit and report)

**Start URL (log in first):** https://appstoreconnect.apple.com
App **Founder Mode Advice**, Apple ID **6799753048**, bundle `com.foundermodeadvice.app`.

This is **not** a setup script — `02-app-store-connect.md` is. This one reads the app record
back and tells you what is actually standing between you and a submission, including the
demo-account field that gets sign-in-gated apps rejected under Guideline 2.1 more often than
any code bug.

--- COPY FROM HERE ---

You are auditing an App Store Connect record before submission and reporting what is
incomplete. I am signed in at appstoreconnect.apple.com. The app is **Founder Mode Advice**,
Apple ID **6799753048**, bundle `com.foundermodeadvice.app`, published by Saint Marlo Labs
LLC.

## GROUND RULES — READ THESE FIRST

- This is **READ-MOSTLY**. Do **NOT** submit anything for review. Do NOT click "Add for
  Review", "Submit to App Review", or "Release". If you think something needs submitting,
  tell me instead.
- Do NOT change pricing, availability, or the app's release state.
- Do NOT delete or expire any build.
- You MAY fill in App Review Information notes **if and only if** I explicitly confirm the
  text first.
- Report what the screens actually say. Quote status strings verbatim rather than
  paraphrasing.

## STEP 1 — App status

Open the Founder Mode Advice app record. Report:

- Current version number and its status (Prepare for Submission / Waiting for Review /
  Rejected / Ready for Distribution, etc.), quoted exactly.
- Every section still showing a red or yellow incomplete indicator, listed by name.
- If there is a prior rejection, open the Resolution Center and summarize the most recent
  message from App Review, including which guideline number it cites.

## STEP 2 — TestFlight

Go to the TestFlight tab. Report:

- Every build, with build number, upload date, processing state, and expiry date.
- Which build (if any) is currently available to testers.
- Whether any build shows a Missing Compliance / export compliance prompt.
- iOS builds expire **90 days** after upload — flag any build expiring within 14 days.

## STEP 3 — App Review Information (this is the one that gets apps rejected)

Open App Information / the version's App Review Information section. Report:

- Whether **"Sign-in required"** is checked, and whether a demo account username and password
  are filled in. Founder Mode Advice gates its entire product behind an account — a reviewer
  who cannot get past the login screen rejects the build. If sign-in is required and there is
  **no demo account**, flag this as a **LIKELY REJECTION under Guideline 2.1**.
- The current contents of the Notes field.
- Contact first name, last name, phone, and email.

## STEP 4 — App Privacy

Report whether the App Privacy questionnaire is complete, and list the declared data types.
Flag any "not started" section.

Specifically check whether **analytics (PostHog)** is declared. The repo's own privacy matrix
lists it as an open TODO, so an undeclared analytics SDK is a plausible finding here rather
than a hypothetical.

## STEP 5 — Agreements

Go to Business → Agreements, Tax, and Banking. Report the status of the **Paid Applications**
agreement specifically (Active / Pending / Not started), plus whether tax and banking are
complete. In-app purchases cannot be reviewed without an active Paid Applications agreement.

Also confirm the membership is the **Organization** account for Saint Marlo Labs LLC — the
seller name shown on the App Store comes from the membership.

## STEP 6 — In-app purchases

List every in-app purchase on the record with its Product ID, type, price, and review status.

Expected:

```
seed_monthly       The C-Suite Monthly    $9.99/month
series_z_monthly   The Boardroom Monthly  $19.99/month
```

Both should sit in the subscription group **Founder Mode Advice Subscriptions**. Flag any
that are missing, priced differently, or in a state other than Ready to Submit / Approved.
Product IDs are immutable once created — if one is misspelled, say so loudly; it cannot be
renamed.

Also report whether each subscription has a **review screenshot** attached. A subscription
without one blocks the submission.

## STEP 7 — EU DSA trader declaration

Report whether the trader status / DSA compliance section is complete. It is required for
distribution in the EU, and the app is configured for all territories.

## REPORT BACK

Give me a single prioritized checklist titled **"Blocking submission"** — hard blockers
first, then warnings, then things that are fine. For each blocker say exactly which screen to
fix it on.

End with the one thing you would do next, and **confirm you submitted nothing.**

## CAPTURE

```
VERSION_STATUS=
INCOMPLETE_SECTIONS=[list]
LATEST_BUILD=            EXPIRES=
DEMO_ACCOUNT_PRESENT=yes/no
SIGN_IN_REQUIRED=yes/no
APP_PRIVACY_COMPLETE=yes/no    POSTHOG_DECLARED=yes/no
PAID_APPS_AGREEMENT=
IAP_STATUS=seed_monthly:…  series_z_monthly:…
IAP_REVIEW_SCREENSHOTS=yes/no
DSA_TRADER_COMPLETE=yes/no
SUBMITTED_ANYTHING=no
```

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| 1 App status | | |
| 2 TestFlight builds | | |
| 3 App Review Information | | |
| 4 App Privacy | | |
| 5 Agreements | | |
| 6 In-app purchases | | |
| 7 DSA trader | | |

## Why this one is read-only

A submission is hard to unwind and starts a review clock — that is your call, not an agent's.

The demo account is not optional. Founder Mode Advice puts analysis, the library, profiles
and Discover behind an account, so App Review will hit a sign-in wall on the first tap.
`docs/app-store/BLOCKERS.md` #5 tracks the same thing.
