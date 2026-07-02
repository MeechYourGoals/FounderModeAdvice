## Goal
Make `/` (the public marketing page) read as work by a senior product-marketing designer, not as a Lovable template. Remove the visible "AI tell" (italic-serif word swapped into a blue gradient), retype the hero, replace generic lucide glyphs with bespoke marks, and layer in the motion polish the current page is missing. Keep every existing section, prop, route, and CTA intact.

## 1. Copy + hero headline
- **Replace the H1** in `src/components/PublicLanding.tsx` (line 97–100) with:
  > **Build your boardroom, then instill their insights.**
  Rendered as one weight, one family, no italic swap, no gradient span. Sub-eyebrow ("Transcript-grounded founder intelligence") and body paragraph stay.
- No other copy changes — only the accent treatment changes.

## 2. Kill the italic-serif-gradient accent pattern (the "AI tell")
Every `<span className="font-display font-medium italic text-gradient">…</span>` gets removed. The word stays; only the styling is dropped so the whole headline reads in one voice.

Files + line refs already located:
- `src/components/PublicLanding.tsx` — lines 99, 150, 191, 222, 277, 301, 347, 379, 408, 443 (10 headline accents), plus the italic display numerals at 552 and 561 (step numbers) → switch to plain sans, muted-foreground, tabular-nums.
- `src/components/HeroSection.tsx` — line 28 ("Advice") → plain.
- `src/components/marketing/SampleDemo.tsx` — line 42 ("in action") → plain.

To keep the page from going flat once the italics are gone, hierarchy gets rebuilt with:
- Tighter tracking + heavier weight on primary headings (`tracking-[-0.02em] font-semibold`).
- Small-caps eyebrows above each section, single accent color line under the eyebrow (a 24px rule, not a chip).
- One brand-blue underline sweep on hover for key links only — no per-word recoloring.

## 3. Bespoke glyph system (replace generic lucide icons)
Right now section marks and feature bullets use stock `Check`, `Target`, `MessageSquare`, `ShieldCheck`, `Layers`, `ScrollText`, `X`. Replace with a small in-repo SVG glyph set (`src/components/marketing/glyphs/`) that shares one stroke language:
- 1.25px stroke, square caps, 20×20 viewBox, single-color `currentColor`.
- 6 marks: `TranscriptGlyph`, `BoardroomGlyph`, `SignalGlyph`, `MemoGlyph`, `LibraryGlyph`, `GuardrailGlyph`.
- Lucide icons stay for functional UI (nav arrows, close buttons, form affordances). Only marketing-surface icons swap.

## 4. Motion + interaction polish (Claude Fable-tier feel)
Introduce a small, disciplined motion layer — not confetti.
- **Scroll reveals**: keep existing `Reveal`, but add a companion `ParallaxLayer` (translateY driven by `useScroll` from framer-motion) for the hero grid, mesh, and the SampleDemo product screen so background layers drift at different rates.
- **Hero orchestration**: staggered word-by-word entrance on the H1 (opacity + 8px y, 40ms stagger, easeOut), then eyebrow, body, CTAs — one cinematic entrance, not per-section confetti.
- **Section transitions**: as each section enters the viewport, its eyebrow rule animates from 0 → 24px width (300ms), heading fades in, supporting card group staggers in with 60ms delay.
- **Card hover**: feature cards get a shared `hover:` treatment — 1px border brightens to `border-primary/40`, subtle inner-glow via `shadow-[inset_0_1px_0_hsl(var(--primary)/0.12)]`, and a 4px translateY. Removes today's flat static feel.
- **Use-cases carousel**: convert the current static "Built for the decisions founders actually face" grid into a horizontally-snapping carousel with drag + arrow controls (Embla, already in the dep tree via shadcn's `carousel`). Auto-advance disabled; keyboard + swipe supported.
- **Pricing hover**: highlighted tier lifts + gains a soft ambient glow; other tiers dim to 70% opacity so the eye lands on the recommended plan.
- **Section dividers**: replace hard borders with a thin animated gradient hairline that draws in on reveal.

All motion respects `prefers-reduced-motion` (framer-motion's `useReducedMotion` short-circuits to no transform, only opacity).

## 5. Sample demo — on-brand color pass
`src/lib/sampleDemoData.ts` line 58 uses `#22c55e` (green) for the "Defense Partnerships" folder chip, which is what the user is seeing bleed through the demo video. Swap to the brand-consistent palette already used elsewhere in that file: `#2563eb` (primary blue), `#14b8a6` (teal), `#e11d48` (rose), `#f97316` (amber), `#8b5cf6` (violet). New value: `#0ea5e9` (sky) — stays inside the cool-blue family and reads as "on brand" against the rest.
Audit the demo scene rendering for any hardcoded `emerald`/`green` Tailwind classes at the same time; drop them for `primary` / `sky` tokens.

## 6. Not in scope
- No changes to auth, pricing tiers, DB, edge functions, favicons, or app shell.
- No new npm dependencies beyond what's already in the project (Embla + framer-motion are already installed).
- The in-app product surfaces (`/library`, `/favorites`, etc.) are untouched — this is a marketing-page overhaul only.

## Technical notes
- **Files touched**: `src/components/PublicLanding.tsx`, `src/components/HeroSection.tsx`, `src/components/marketing/SampleDemo.tsx`, `src/components/marketing/HeroProductScene.tsx`, `src/lib/sampleDemoData.ts`, plus new files under `src/components/marketing/glyphs/` and one new `src/components/marketing/ParallaxLayer.tsx`.
- **CSS**: `src/index.css` — retire the `.text-gradient` usage on marketing surfaces (leave the utility for possible future use), add `.eyebrow-rule` and `.hairline` utilities for the new hierarchy.
- **Verification**: `tsgo` typecheck, capture the rebuilt page at 1440px + 390px via Playwright, and confirm zero remaining `font-display font-medium italic text-gradient` on the marketing route.
- **Rollback**: single revert restores current landing.
