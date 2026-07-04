## Goal

Add two new content surfaces to Founder Mode Advice, modeled on ChravelApp's `/use-cases` + `/blog` system, but branded to FMA (deep navy + primary accent, no gold). Keep the existing landing `#use-cases` "decisions founders face" list untouched — the new **Scenarios** system is the "who this is for" surface (personas), and **Blog** is long-form editorial.

## Architecture

```
src/pages/
  ScenariosHub.tsx            new — /scenarios
  ScenarioPage.tsx            new — /scenarios/:slug
  BlogIndex.tsx               new — /blog
  BlogPost.tsx                new — /blog/:slug

src/components/marketing/editorial/
  ArticleShell.tsx            <main> wrapper + ambient primary tint + max-w container
  ArticleHeader.tsx           kicker + H1 + dek + breadcrumb
  EditorialKicker.tsx         small-caps eyebrow with hairline
  ProseBody.tsx               typed section-block renderer (p/h2/ul/quote/callout)
  ScenarioCard.tsx
  PostCard.tsx
  RelatedRail.tsx             cross-links Scenario ↔ Blog

src/lib/content/
  scenarios.ts                typed Scenario[] registry (source of truth)
  blog.ts                     typed BlogPost[] registry
  seoJsonLd.ts                siteIdentity / breadcrumb / itemList / article / faq builders
  readingTime.ts              estimateReadingMinutes()

src/App.tsx                   add 4 lazy public routes
src/main.tsx                  wrap in <HelmetProvider>
src/components/PublicLanding.tsx
                              add "Scenarios" section (3 featured + link to /scenarios)
src/components/marketing/LandingNav.tsx
src/components/Footer.tsx     add Scenarios + Blog links
public/sitemap.xml            add /scenarios, /blog, and every slug
index.html                    remove <link rel="canonical"> (per-route owns canonical)
package.json                  + react-helmet-async
```

Content lives as typed TS records (same pattern as ChravelApp's `src/lib/blog.ts`). No CMS, no MDX build step.

## Scenario data model

```ts
type Scenario = {
  slug: string;                    // 'yc-founder-batch-prep'
  persona: string;                 // 'YC founder, current batch'
  cardTitle: string;               // 'From batch to demo day'
  cardTagline: string;
  cardCtaLabel: string;
  stakes: string;                  // "What's actually on the line"
  decisionsFaced: string[];        // 4–6 concrete decisions
  sampleAnalysisPrompt: string;    // the exact question they'd paste
  sampleMemoBullets: string[];     // 3–5 bullets of FMA output
  recommendedOperators: string[];  // names from src/lib/founders.ts
  faq: { q: string; a: string }[];
  datePublished: string;
  updatedAt?: string;
};
```

**Launch set (8 scenarios):**

1. `yc-founder-batch-prep` — YC founder mid-batch
2. `series-b-fundraise` — Series B, defending metrics
3. `mom-and-pop-car-wash` — local operator scaling like PE
4. `fortune-500-downsizing` — F500 CEO running a RIF
5. `bootstrapped-solo-founder` — profitable, no board
6. `first-vp-sales-hire` — hiring & org-design
7. `pricing-repricing` — repricing existing SaaS
8. `board-meeting-prep` — quarterly deck + asks

## Blog data model

```ts
type BlogPost = {
  slug: string;
  h1: string;
  title: string; description: string;    // SEO
  datePublished: string;
  excerpt: string;
  sections: Array<
    | { kind: 'p'; text: string }
    | { kind: 'h2'; text: string }
    | { kind: 'ul'; items: string[] }
    | { kind: 'quote'; text: string; attribution?: string }
    | { kind: 'callout'; title: string; body: string }
  >;
  relatedScenarios?: string[];
};
```

**Launch set (4 posts):**

1. "How to pressure-test a Series B narrative in a weekend"
2. "The operator library, not the podcast feed"
3. "Turning a 90-minute YC talk into a 1-page decision memo"
4. "Downsizing with dignity: what F500 CEOs get wrong that founders get right"

## Visual system (FMA, not ChravelApp)

- Reuse existing tokens: navy field, `primary` accent, hairline borders, `eyebrow-rule` small-caps.
- **No gold.** Where ChravelApp uses `gold-*`, we use `hsl(var(--primary))` and `hsl(var(--primary)/.7)`.
- Reuse `SectionShell`, `panel-hairline`, `link-sweep`, and `motion.tsx` primitives from `src/components/marketing/`.
- Ambient masthead: single top radial in primary at ~9% opacity.
- Cards: hairline-bordered panels, no glass, subtle inner top highlight.
- Motion: `MReveal` + `staggerParent` + `riseChild`. Animations stay on (owner reversed reduced-motion gating; don't re-add).
- Typography: existing stack. H1 `tracking-[-0.025em] font-semibold`. Body `text-[15px] leading-relaxed`.

## SEO

- Adopt `react-helmet-async` (single new dep). Wrap app once in `<HelmetProvider>`.
- Each hub + slug page emits its own `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:*`, and JSON-LD.
- JSON-LD per page: `BreadcrumbList` everywhere; `ItemList` on hubs; `Article`/`BlogPosting` on posts; `FAQPage` on scenarios that have FAQ.
- Canonical + `og:url` self-reference every route (per skill guidance).
- Remove sitewide `<link rel="canonical">` from `index.html`; keep sitewide `og:*` as fallback for non-JS crawlers.
- `sitemap.xml` regenerated to include all new URLs.

## Landing wiring

`PublicLanding.tsx`:

- Keep existing `#use-cases` "decisions founders face" list untouched (**Option A**).
- Add a new **Scenarios** section below it: 3 featured `ScenarioCard`s + "See all 8 scenarios →" link to `/scenarios`.
- `LandingNav` + `Footer`: add `Scenarios` and `Blog` links.

## Routes (add to `src/App.tsx`)

```
/scenarios         → ScenariosHub          (lazy, public)
/scenarios/:slug   → ScenarioPage          (lazy, public)
/blog              → BlogIndex             (lazy, public)
/blog/:slug        → BlogPost              (lazy, public)
```

## Out of scope

- No CMS, no MDX toolchain.
- No changes to auth, Paddle, backend schema, edge functions, in-app product surfaces.
- No changes to the existing landing `#use-cases` list (per Option A).
- No AI-generated body copy; scenarios/posts are hand-authored TS.
- No og:image generation unless the user asks.

## Verification

1. `tsgo` typecheck passes.
2. Playwright at 1440×900 and 390×844: `/scenarios`, `/scenarios/yc-founder-batch-prep`, `/blog`, `/blog/<slug>` render, no console errors, no horizontal overflow, nav + footer links resolve, JSON-LD present in DOM, per-route `<title>` + canonical correct.
3. `sitemap.xml` includes every new URL; `robots.txt` unchanged.
4. Landing still renders; new Scenarios section visible on desktop + mobile; existing `#use-cases` list intact.

## Rollback

Additive new files + small edits to `App.tsx`, `main.tsx`, `PublicLanding.tsx`, `LandingNav`, `Footer`, `sitemap.xml`, `index.html`, `package.json`. Single revert restores prior state; no DB, no config changes.
