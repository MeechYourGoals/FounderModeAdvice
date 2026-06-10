# FMA — Marketing Polish, Demo Video & App Store Launch Prep

Four coordinated workstreams. Each ships independently so you can review as we go.

---

## 1. Final sparkle/lightning sweep

A `Sparkles` import still lingers in `src/pages/Account.tsx` (line 11) even though usages were removed previously. Audit will:

- Remove `Sparkles` from the Account import (and any other dead `Sparkles`/`Zap` imports).
- Re-scan with `rg` for `Sparkles|Zap|⚡|✨|🌟|💫|⭐|🔥|Bolt\b|sparkle` across `src/`, `index.html`, `public/manifest.webmanifest`, and any marketing copy strings (headlines, feature blurbs, button labels).
- Replace any remaining glyphs with neutral lucide icons (`Crown`, `ArrowUp`, `Rocket`, `Play`, `Check`) chosen by context.

---

## 2. Port GolfReady marketing polish to FMA

Borrow the four systems you selected from `GolfReady Guide` (project `6eb946da…`) and adapt them to FMA's green/teal brand. Concretely:

**Typography & spacing**
- Mirror Golf's display/body font pairing and modular type scale (display → h1 → h2 → eyebrow → body → caption).
- Adopt Golf's section rhythm tokens (vertical padding scale, max-width container, gutter).
- Apply across `PublicLanding.tsx` and any `src/components/marketing/*` blocks.

**Hero layout & composition**
- Restructure the public hero: eyebrow tag → tight headline → supporting sub → primary + secondary CTA → trust strip → framed product visual.
- Replace centered-everything with the asymmetric split Golf uses (copy left, framed device/screenshot right at desktop; stacked on mobile).

**Section patterns**
- Port Golf's feature-card grid, "how it works" numbered steps, testimonial block, and FAQ accordion styling. Reuse FMA's existing data — only the shells change.

**Color & gradient treatments**
- Keep FMA's vibrant green primary (`hsl 142 76% 36%`), but adopt Golf's surface tokens: layered background tints, soft radial glow behind hero, subtle gradient dividers between sections, refined dark-mode surface stack.
- All values land in `src/index.css` as semantic tokens — no hardcoded hex in components.

No business logic changes. Auth, analysis flow, profiles, and bookmarks all stay untouched.

---

## 3. Remotion hero demo video (60s)

Build a cinematic brand film embedded on the public marketing page.

**Narrative arc (60s @ 30fps = 1800 frames, ~5 scenes)**
1. Cold open — "Every founder gets advice. Almost none of it fits." Bold type over green gradient field.
2. The paste — animated YouTube URL dropping into the analyze field, profile chip ("Maple & Oak Coffee") attaching.
3. AI extraction — insight cards flying in with category tags (Margin leverage, Influencer marketing, Competitor analysis…), each tailored line typewriter-revealed.
4. Library & bookmarks — folder/tag organization montage, dark-mode polish moment.
5. Close — FMA logo lockup, "Founder Mode Advice", URL.

**Style:** Tech-product aesthetic — bold sans display, snappy springs, FMA green accent, deep navy backgrounds, subtle grid texture, NetworkFirst transitions between scenes via `@remotion/transitions`.

**Pipeline**
- Scaffold a `remotion/` project per the video-creator skill (musl compositor fix, headless render).
- Render to `public/marketing/fma-demo.mp4` (H.264, muted, 1920×1080) and a poster `public/marketing/fma-demo-poster.jpg` at frame 30.
- Externalize the MP4 via `lovable-assets` so the repo stays light; reference the CDN URL.
- Embed on `PublicLanding.tsx` in a framed device/browser chrome, autoplay muted loop with playsinline, lazy-loaded, with a poster fallback and reduced-motion guard (`prefers-reduced-motion` → poster only).

---

## 4. App Store launch prep (iOS + Android)

**Icons & favicons** — regenerate from the existing crisp red FMA PNG:
- iOS: `AppIcon` set 1024 (marketing), 180, 167, 152, 120, 87, 80, 60, 40, 29, 20 — written to `ios/App/App/Assets.xcassets/AppIcon.appiconset/` with `Contents.json`.
- Android: adaptive icon foreground/background 432×432, plus 192/144/96/72/48 mipmaps under `android/app/src/main/res/mipmap-*`.
- Web: confirm favicon-16/32, apple-touch-icon 180, `pwa-192`, `pwa-512`, `maskable-512` (regenerate maskable with safe-zone padding).
- `manifest.webmanifest`: add `purpose: "any maskable"` entry, verify `name`, `short_name`, `theme_color`, `background_color`, `display: standalone`, `start_url`, `scope`.

**Screenshots** — auto-capture from the live signed-in app via the browser tool:
- Sign-in is required; I'll pause and ask you to sign in once in the preview, then drive the capture script.
- Routes captured: landing hero, analysis form with profile attached, insights detail, library/folders, bookmarks, settings.
- Sizes generated per store spec:
  - **iOS:** 6.9" 1320×2868, 6.7" 1290×2796, 6.5" 1242×2688, 5.5" 1242×2208, iPad 13" 2064×2752 (required tiers).
  - **Android:** phone 1080×1920 (min 2, up to 8), 7" tablet 1200×1920, 10" tablet 1600×2560, Play feature graphic 1024×500.
- Each screenshot framed in a device mockup with a one-line marketing headline ribbon ("Paste a video. Get advice tailored to your business."). Frames generated in code (no external designer step) and exported as PNG to `/mnt/documents/app-store/{ios,android}/`.

**Listing metadata draft** — produce `docs/app-store-listing.md` with: app name, subtitle, promotional text, full description, keywords, support URL, privacy URL, category, age rating notes, "What's new" v1.0 copy. You'll paste these into App Store Connect / Play Console.

**Capacitor sync notes** — short `docs/app-store-launch.md` runbook covering `npx cap sync`, signing, archive/upload steps, TestFlight + Internal Testing track. No store submission happens from Lovable — outputs are upload-ready artifacts.

---

## Execution order & checkpoints

1. Sparkle sweep (small, instant verify).
2. GolfReady polish port (review visually before video).
3. Remotion video (render + embed; review the MP4).
4. App Store assets (icons first, then screenshots — I'll pause for sign-in before capture).

I'll publish after step 2 so you can compare the new marketing look on the live URL, then again after step 3 with the video live.

---

## Technical notes

- All color/spacing changes go through `src/index.css` tokens and `tailwind.config.ts`; no hardcoded utilities in components.
- Remotion project lives in `remotion/` (gitignored `node_modules`); MP4 output goes through `lovable-assets` to keep the repo small.
- iOS/Android icon directories only get written if Capacitor platforms exist; otherwise I'll stage them under `app-store-assets/ios/` and `app-store-assets/android/` and the runbook will instruct copying after `npx cap add`.
- Screenshot capture uses the existing browser tool at exact device viewport sizes — no Playwright install needed.
- No schema, RLS, or edge-function changes in this plan.
