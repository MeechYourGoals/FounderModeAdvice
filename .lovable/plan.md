# Replace the Generative Demo Video with a Remotion Product Walkthrough

## Why redo it
The current `src/assets/demo-video.mp4` was produced by a text-to-video model. It shows a generic "person at a laptop," fake UI, and blurry, illegible captions — exactly what a marketing site for an AI product should not show. We will replace it with a fully code-rendered Remotion video that displays the real Founder Mode Advice UI, real copy, and crisp typography.

## Creative direction

- **Aesthetic:** "Tech Product / Editorial Dark" — matches the site (dark navy/black gradient, vibrant green primary `hsl(142 76% 36%)`, white text).
- **Length:** 30 seconds at 30 fps (900 frames). Stays inside the 10‑minute render budget and keeps every beat punchy.
- **Resolution:** 1920×1080 (16:9), H.264, muted.
- **Typography:** Inter (body/UI) + Fraunces Italic (display accent) via `@remotion/google-fonts`. Minimum on-screen size 36 px; hero type 96–140 px. No text smaller than 28 px ever appears.
- **Motion system:**
  - Default entrance: 18‑frame spring (`damping: 18, stiffness: 180`) with 8 px Y offset + opacity.
  - Accent entrance (hero titles, big numbers): spring `damping: 12` with scale 0.96 → 1.
  - Scene transitions: `fade` (12 frames) between most scenes; one `slide` from-right between Scene 3 → 4 for a "next step" feeling.
  - Persistent layers: subtle aurora gradient + slow drifting green orb behind every scene for continuity.
- **Visual motifs:** rounded 24 px cards with 1 px border `rgba(255,255,255,0.08)`, soft green glow on the active element, a thin progress rail at the bottom that fills across the whole video.

## The prompt (storyboard) the video is built from

> A 30‑second cinematic product walkthrough for **Founder Mode Advice**, an app that turns any YouTube founder/operator video into personalized advice for your business. Dark editorial aesthetic, vibrant green accent, large legible Inter typography, Fraunces italic for emphasis. Every UI shown is a faithful mock of the real app — no stock laptop photos, no generative people, no fake dashboards.
>
> **Scene 1 — Hook (0:00–0:04, 120 frames).** Black-to-navy gradient. Centered kinetic type: "You don't need a boardroom of advisors —" (88 px, white) staggers in word-by-word, then the line "to learn like you have one." reveals with "learn like you have one" in Fraunces italic green. FMA wordmark fades in bottom-left.
>
> **Scene 2 — Paste a video (0:04–0:10, 180 frames).** Mock of the real Analyze form on a dark card: input field labeled "YouTube URL," a cursor types `https://youtube.com/watch?v=…` character by character (frame-driven typewriter, ~2 cps), then a green "Analyze" button presses (scale 0.96 → 1 spring). A thumbnail card slides in showing a podcast still + title "Scaling a neighborhood business — Operator's Playbook."
>
> **Scene 3 — Pick your context (0:10–0:15, 150 frames).** Profile chips animate in from the left: "Local coffee shop · Pre‑revenue · 2 founders." A second row of chips highlights "Industry: Food & Beverage / Stage: MVP / Goal: First 100 customers." Each chip springs in on its own beat.
>
> **Scene 4 — Personalized insights stream (0:15–0:22, 210 frames).** Split layout: left side shows the YouTube thumbnail with a play badge, right side shows three insight cards stacking in: **Lessons**, **Risks**, **Action items**. Each card title is 44 px, body is 32 px, two bullet lines per card, each bullet reveals with a 6‑frame stagger. Real copy, e.g. "Negotiate rent as a percent of revenue, not a flat lease."
>
> **Scene 5 — Ask the video anything (0:22–0:27, 150 frames).** Chat sheet slides up from the bottom. A user bubble types "How should I price my first 50 customers?" (typewriter). An assistant bubble fades in with a 2‑line answer and a small "Sourced from 03:14" timestamp chip in green.
>
> **Scene 6 — Close (0:27–0:30, 90 frames).** All UI cards fly out, leaving the FMA logo center, with the tagline "Build your boardroom. Instill their insights." (Fraunces italic on the second half). End card holds for 30 frames on a clean dark gradient.

Every text element above is rendered as real DOM text styled with Tailwind — guaranteed pixel-sharp at 1080p. No raster screenshots of UI; no AI-generated frames.

## Implementation steps

1. **Scaffold Remotion project** at `remotion/` per the video-creator skill (bun init, install `remotion`, `@remotion/cli`, `@remotion/renderer`, `@remotion/bundler`, `@remotion/transitions`, `@remotion/google-fonts`, `@remotion/fonts`, React, TS; fix the musl compositor + symlink ffmpeg/ffprobe).
2. **File layout:**
   ```text
   remotion/
     src/
       index.ts
       Root.tsx                  // Composition id="demo", 1920x1080, 30fps, 900 frames
       MainVideo.tsx             // persistent layers + TransitionSeries
       components/
         PersistentBackground.tsx
         UiCard.tsx              // shared rounded-card primitive
         Typewriter.tsx          // frame-driven typewriter
         InsightCard.tsx
         ChatBubble.tsx
         BrandMark.tsx
       scenes/
         SceneHook.tsx
         ScenePaste.tsx
         SceneProfile.tsx
         SceneInsights.tsx
         SceneChat.tsx
         SceneClose.tsx
     scripts/render-remotion.mjs
     public/
       fma-logo.png              // copied from src/assets/fma-logo-dark
   ```
3. **Load fonts at module scope** using `@remotion/google-fonts/Inter` and `@remotion/google-fonts/Fraunces` (weights 400/600/700, italic for Fraunces).
4. **Build the shared primitives first** (`UiCard`, `Typewriter`, `InsightCard`, `ChatBubble`) so every scene composes from the same vocabulary — that is what makes it look designed, not assembled.
5. **Build the six scenes** with `useCurrentFrame` + `interpolate`/`spring` only. No CSS transitions, no `animate-*`. Each scene exports its own component and its `durationInFrames`.
6. **Wire scenes** through `<TransitionSeries>` with `fade` transitions (12 f) and one `slide` (Scene 3 → 4, 18 f). Account for transition overlap when computing `Composition.durationInFrames` (≈ 870 frames after overlaps; round to 900).
7. **Legibility guards:**
   - Minimum body text 32 px, minimum chip text 28 px, hero text ≥ 88 px.
   - Body copy white at 92% opacity on backgrounds at most `#0B1220`; verified contrast ≥ 7:1.
   - Never animate opacity below 1 on text that is being read; only the entrance crosses 0→1.
   - No `backdropFilter`; only mild `filter: blur(40px)` on one accent orb.
8. **Spot-check key frames** with `bunx remotion still` at frames 60, 240, 480, 720, 870 and visually confirm every word is readable.
9. **Render** to a temp file: `cd remotion && node scripts/render-remotion.mjs` → `/mnt/documents/fma-demo.mp4` (`chromeMode: "chrome-for-testing"`, `muted: true`, `concurrency: 1`).
10. **Publish as a Lovable Asset** and swap the homepage:
    ```bash
    lovable-assets create --file /mnt/documents/fma-demo.mp4 --filename fma-demo.mp4 \
      > src/assets/demo-video.mp4.asset.json
    ```
    Because `SampleDemo.tsx` and `PublicLanding.tsx` already import `@/assets/demo-video.mp4.asset.json`, overwriting that pointer is the swap — no component edits required. Both the hero embed and the modal will pick up the new video automatically.
11. **Delete the old generative MP4 asset** with `assets--delete_asset` so it stops shipping.
12. **Verify in the live preview** that the hero embed and the modal both play the new video and that text is sharp at the preview's natural size.

## Out of scope

- No changes to `PublicLanding.tsx` or `SampleDemo.tsx` layout — only the underlying video file changes.
- No audio / voiceover (kept muted to match current UX and avoid encoder issues in the sandbox).
- No screen recording of the live app; the UI is reproduced in Remotion components so we control every pixel and font.
