# Screenshot Production Package

## Required store sizes (portrait)

| Device tier | Pixels | Status |
| --- | --- | --- |
| iPhone 6.9" | 1320 × 2868 | raw capture pipeline ✅ (2 public frames captured; app frames need demo account) |
| iPad 13" | 2064 × 2752 | same |
| (Play, later) Android phone | 1080 × 2400 | same pipeline |

## What exists now

`app-store-assets/screenshots/raw-web-captures/` — pixel-exact, true
mobile/tablet layout captures produced by `scripts/generate-screenshots.spec.ts`
(logical device size × deviceScaleFactor — 440×956@3x, 1032×1376@2x — so the
app renders its REAL phone/tablet UI, unlike the older stretched captures in
the legacy folders, which should not be used).

Captured in this environment (no backend egress, no demo credentials):
- `*-01-landing.png` — public landing with fictional sample analysis
- `*-02-auth.png` — sign-in screen (app mode)

The authenticated storyboard frames below must be captured where the
production backend is reachable, with the seeded demo account:

```bash
npm run build && npx vite preview --port 8080 --host 127.0.0.1 &
APP_SCREENSHOT_BASE_URL=http://127.0.0.1:8080 \
APP_SCREENSHOT_EMAIL=<demo account email> \
APP_SCREENSHOT_PASSWORD=<demo account password> \
APP_SCREENSHOT_DIR=app-store-assets/screenshots/raw-web-captures \
npx playwright test scripts/generate-screenshots.spec.ts
```

These raw frames are honest, unmodified app screens (App Review requires
screenshots to reflect the actual app). The compositor may place them inside
device frames on branded backgrounds with headline text — but the app pixels
themselves must remain real.

## Demo state (fictional, rights-cleared — REPRODUCIBLE RUNBOOK)

Create on the demo account before capturing (≈15 min):
1. Business profile: **"Northwind Robotics"** — Seed stage, Industrial
   Automation, B2B hardware-as-a-service. (Fictional; no real customer data.)
2. Analyze 3 public sources the team has clear rights context for (talks
   published by their own channels work well; avoid music/entertainment):
   a founder interview video, an operator essay/article, a podcast episode.
3. Upload `sample-board-update.pdf` — a 1-page fictional board memo written
   by the team (no real names) — to show private-document analysis.
4. Bookmark 2 insights; create folder **"GTM Playbook"** with 2 analyses;
   add one insight note ("Discuss at Monday standup").
5. Run one Ask-follow-up exchange on an analysis (Boardroom feature — use a
   temporarily upgraded internal account, or capture the upsell state
   honestly if the demo account stays free).
6. Set the active profile so memos show "For Northwind Robotics" chips.

## Eight-scene storyboard (per device; first 3 carry the message)

| # | Headline (compositor text) | App screen to capture | Capture route/state |
| --- | --- | --- | --- |
| 1 | Turn great advice into action | Analysis detail — lessons + risks + action items visible with impact scores | open the analyzed founder-interview memo |
| 2 | Any source becomes an operating memo | Home "New analysis" with URL field + upload zone + source-type hints | `/?source=app` signed in |
| 3 | Ground every insight in the source | Analysis detail scrolled to a quoted/grounded insight (transcript-anchored callout) | same memo, insights section |
| 4 | See lessons, risks, and next moves | Memo section tabs / callout cards (Risk card like "Hiring a VP of Sales too early…") | memo detail |
| 5 | Ask follow-ups for your company | Ask-the-video chat sheet with one Q&A exchange | VideoChatSheet open |
| 6 | Build your founder intelligence library | Home library/episodes table with folders + analyzed badges | `/?source=app` scrolled to library |
| 7 | Find the right insight instantly | Favorites/bookmarks with pinned chips + collections | `/favorites` |
| 8 | Save and share what matters | Share dialog on an analysis (invite teammates) or Shared-with-me list | `/shared` or share dialog open |

iPad: same narrative; capture the two-column/tablet layouts; verify no
stretched-phone appearance (the responsive layout serves real tablet grids).

## Compositor notes

- Background: brand dark `#0c0e15` with the aurora/gradient accent already
  used on the landing page; headline set in the display serif (Fraunces)
  matching the marketing site; keep ≥120 px safe margin from edges.
- Do not overlay claims not visible in the frame (no fabricated features).
- Localized price text must NOT be baked into marketing frames (prices vary
  by storefront) — the paywall frame is for Apple's subscription review
  field only, not the public gallery.
- Status bar: captures are browser-rendered and have no iOS status bar;
  either composite a neutral 9:41 status bar into the device frame art or
  crop the frame mount to cover it. Final-frame QA on a real device
  (TestFlight) before submission is in the RELEASE_CHECKLIST.

## Apple subscription review screenshot (separate requirement)

Each subscription product needs a review screenshot showing the LIVE paywall
in the real app (RevenueCat paywall with localized price). Capture from an
EAS development/preview build or TestFlight on device/simulator
(⌘S in Simulator), any supported size ≥ 640×920. Store under
`app-store-assets/screenshots/iap-review/`. Cannot be produced from the web
render — requires the native build with StoreKit products configured.
