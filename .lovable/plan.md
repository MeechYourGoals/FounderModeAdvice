## Diagnosis: the missing "Use cases" section

`src/components/PublicLanding.tsx` currently renders the "Built for the decisions founders actually face" grid inline. On the live site it's either scrolled past unnoticed or visually collapsing into the surrounding card rhythm — it's not gated by data/auth, not conditionally hidden, not routed away. Root cause is **presentation, not availability**: it reads as one more generic 3-card grid, so it disappears into the page.

Fix: extract it into a first-class section with its own visual language and anchor (`#use-cases`), promoted in the section rhythm and linked from the hero secondary CTA so it's discoverable.

## Rebuild scope

Full rebuild of `src/components/PublicLanding.tsx` into a distinct Founder Mode Advice visual system. Nothing about routing, auth, CTAs, Paddle checkout, or analytics changes. Copy stays as-is unless a layout beat needs a shorter line.

## New page architecture

```
Hero                    → scroll-driven Transcript → Memo transformation
Proof strip             → 3 signal lines, hairline dividers, no cards
How it works            → 4 numbered beats, monospace step index, connective vertical rule
Use cases (RESTORED)    → editorial 2-column list, not a card grid; anchor #use-cases
Sample demo             → existing <SampleDemo/>, reframed with an eyebrow + hairline
Boardroom vs. feed      → side-by-side comparison rail
Pricing                 → existing <PricingPlans/> wrapped in a quieter shell
FAQ / closing CTA       → single-column, generous negative space
Footer
```

## Signature hero: Transcript → Memo

Left rail is a live-typing transcript column (monospace, low-contrast). As the user scrolls the hero (pinned via `position: sticky` on a tall container, driven by `useScroll` from framer-motion which is already in the tree), transcript lines fade/translate out and get replaced, in sequence, by:

1. **Citations** — timestamped chips pulled from the transcript lines
2. **Risks** — 2 red-outline callouts
3. **Actions** — checkbox-styled action items
4. **Founder question** — a single italicized prompt
5. **Decision brief** — a compact memo card assembles from the fragments above

Right rail holds the H1 ("Build your boardroom, then instill their insights.") and CTAs; both stay static while the left rail transforms. On mobile and under `prefers-reduced-motion` the transformation degrades to a static 2-panel "transcript / brief" side-by-side — no scroll pinning.

## Visual system — deliberately not SeatMap Sentry

- **Layout DNA**: right-heavy hero (headline on the right, artifact on the left) — opposite of the SeatMap left-copy/right-mockup pattern. No square product-card in the hero. No dark grid background.
- **Background**: single deep-navy field (`hsl(222 47% 6%)`) with a low-opacity radial gradient anchor top-right; a slow-drift noise texture layer at 4% opacity. No neon grid, no floating orbs.
- **Section rhythm**: full-bleed sections separated by a 1px animated gradient hairline that draws in on reveal (already stubbed as `.hairline` in `index.css`).
- **Cards**: replace rounded soft cards with **hairline-bordered panels** (1px `border-white/8`, no shadow, subtle inner top highlight `shadow-[inset_0_1px_0_hsl(var(--primary)/0.08)]`). No glassmorphism.
- **Eyebrows**: existing `.eyebrow-rule` (small-caps + 24px underline) already added; reused on every section.
- **Typography**: keep current stack (no new font install). Enforce `tracking-[-0.02em] font-semibold` on H1/H2, `text-[15px] leading-relaxed` for body. No italic-serif accent words (already removed last turn — plan preserves that).
- **Interactive surfaces**: nav links get a story-link underline sweep; CTAs get a 1px primary-tinted border on hover + 2px translateY; cards get border brighten + 4px translateY; use-case rows get a left-edge accent bar on hover.

## Motion system

- `Reveal` (existing) drives section entrances. Hero words stagger in via a new small `HeroWords` component (opacity + 8px y, 40ms stagger). All motion respects `useReducedMotion`.
- Scroll-pinned hero uses `useScroll({ target, offset: ["start start","end start"] })` + `useTransform` to sequence transcript→memo fragments across five keyframe bands.
- Passive listeners only; cleanup on unmount. No mouse-move parallax on mobile.
- Cursor-reactive background: a single 400px radial glow following the cursor on desktop, throttled with `requestAnimationFrame`, disabled below `lg` and under reduced-motion.

## Use-cases section (the restore)

Editorial two-column list, not a card grid:

- Left column: eyebrow "USE CASES" + H2 "The decisions founders actually face" + one-line lead.
- Right column: 6 rows, each a hairline-divided line with a bespoke inline glyph, a bold headline, a one-line supporting phrase, and a subtle `→` that animates right on hover. Anchor id `use-cases`; hero secondary CTA scrolls to it.
- Content preserved from current implementation.

## Files touched

- `src/components/PublicLanding.tsx` — full rebuild.
- `src/components/marketing/HeroTranscriptMemo.tsx` — **new**, scroll-driven hero artifact.
- `src/components/marketing/UseCasesList.tsx` — **new**, editorial list.
- `src/components/marketing/SectionShell.tsx` — **new**, shared eyebrow + hairline + reveal wrapper (kills repetition).
- `src/components/marketing/glyphs/` — **new**, 6 bespoke 20×20 SVG glyphs (`Transcript`, `Boardroom`, `Signal`, `Memo`, `Library`, `Guardrail`) sharing one stroke language.
- `src/index.css` — add `.panel-hairline`, `.link-sweep`, `.section-divider-animated`; retire unused `.text-gradient` calls on marketing routes.
- `src/components/HeroSection.tsx` — untouched (in-app hero, not marketing).
- `src/components/marketing/SampleDemo.tsx` — minor: wrap in new `SectionShell`.
- Dead code removal: any inline card variants replaced by `SectionShell` + `panel-hairline` get deleted from `PublicLanding.tsx`; no orphan imports left.

## Out of scope (explicit)

- No new npm deps. Framer Motion + Embla + shadcn already installed.
- No changes to `HeroSection`, in-app product surfaces, auth, Paddle, Supabase schema, edge functions, SEO metadata, or routes.
- No font install. No WebGL/Three.js. No particle field.
- No copy rewrites beyond line-break tightening where a new layout beat requires it.

## Technical notes

- Scroll-pin implemented with a `min-h-[220vh]` container + `sticky top-0 h-screen` inner; `useScroll` scoped to the container ref. This keeps the rest of the page fully scrollable and avoids body-scroll hijacking.
- Cursor glow lives in a single portal-less `<div>` under the hero, `pointer-events-none`, `mix-blend-screen`, opacity capped at 0.12.
- All new components are pure presentational; no data fetching, no Supabase calls, no auth checks.
- `prefers-reduced-motion`: `useReducedMotion()` short-circuits transforms; opacity-only fades remain. Transcript→memo becomes a static 2-panel layout.
- Accessibility: transcript panel is `aria-hidden` (decorative); memo fragments are real headings/lists so screen readers get the real content. Keyboard focus rings preserved (`focus-visible:ring-2 ring-primary/60`).

## Verification

1. `tsgo` typecheck (auto-run by harness).
2. Playwright script at 1440×900 and 390×844: assert `#use-cases` is in the DOM and visible, hero H1 renders once, no console errors, `document.body.scrollHeight` grows with scroll, CTAs `/auth` and `#use-cases` resolve.
3. Manual: reduced-motion emulation via Chromium flag; confirm static hero fallback.
4. Grep sweep: zero remaining `font-display .* italic .* text-gradient` on marketing routes.

## Rollback

Single-revert: `PublicLanding.tsx` + new files under `src/components/marketing/`. No DB, no config, no route changes to undo.

## Definition of done

- Use-cases section visible and anchored at `#use-cases`.
- Hero uses the transcript→memo composition; SeatMap Sentry pattern gone.
- Reduced-motion honored; no console errors; mobile has no horizontal overflow.
- Existing CTAs, auth, Paddle, and analytics untouched.
- No new dependencies.
