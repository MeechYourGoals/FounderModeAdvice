## Changes

### 1. Remove icons from "Turn expert content into personalized strategy" cards
File: `src/components/PublicLanding.tsx`

- Drop the three lucide icons (Brain, TrendingUp, CirclePlay) from the three `FeatureCard`s in the features grid.
- Update `FeatureCard` so the icon tile is no longer rendered (make `icon` optional / remove the `mb-3 sm:mb-4 flex h-10 w-10 ... bg-primary/10` square entirely).
- Tighten the resulting card padding so the title now sits at the top of the card without a leftover gap where the square used to be.
- Remove the now-unused `Brain`, `TrendingUp`, `CirclePlay` imports.

### 2. Add three more sample insight groups
File: `src/lib/sampleDemoData.ts`

Append three entries to `SAMPLE_INSIGHT_GROUPS` so users see more idea-sparks as they scroll. Each follows the existing `{ title, general, tailored }` shape with Maple & Oak–specific tailored copy:

- **Hiring** — general insight on first operational hires (when to hire vs. systemize), tailored to Maple & Oak's first non-founder hire (lead barista / shift lead to free founders from peak-hour bar work).
- **Influencer marketing** — general insight on micro-influencer credibility vs. paid reach, tailored to Maple & Oak partnering with local food/neighborhood creators for in-store visits and limited drops instead of paid social.
- **Competitor analysis** — general insight on studying competitors for gaps rather than copying menus, tailored to Maple & Oak mapping nearby cafés on speed, seating, and wholesale to find an unowned position.

These will render automatically in the demo since `SampleDemo` iterates `SAMPLE_INSIGHT_GROUPS`.

### 3. Expand the Business profile blurb
File: `src/lib/sampleDemoData.ts`

Extend `SAMPLE_PROFILE.description` with a second sentence written in the voice of a passionate small-business owner — a husband-and-wife family business that put their savings into the shop. Keep it to one extra sentence, warm and personal, not corporate.

## Out of scope
- No backend, schema, or routing changes.
- No changes to the `SampleDemo` component itself — it already loops the data.
