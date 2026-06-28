# Smart Favorites & Auto-Grouping (Premium)

Let users pivot their analyzed library by **founder**, **channel/source**, and **topic** — without manually building folders.

## What we have
- `episodes` already stores `founder_names` (text), `platform`, `url`, plus `companies` and `podcasts` tables.
- `tags` + `lesson_tags` exist but only join to `lessons`, not to episodes/founders/channels.
- `user_has_paid_plan()` already exists for gating.

## Architecture

Three orthogonal facets, one new "Favorites" hub. All three are auto-derived from analysis output so users don't have to tag anything manually.

### A. Schema (one migration)

```sql
-- 1. Channel extraction on episodes (auto-filled on analyze)
ALTER TABLE episodes ADD COLUMN channel_name text;     -- "Y Combinator"
ALTER TABLE episodes ADD COLUMN channel_handle text;   -- "@ycombinator" / tiktok @handle
ALTER TABLE episodes ADD COLUMN topics text[];         -- ["marketing","fundraising"]
CREATE INDEX idx_episodes_channel_handle ON episodes (channel_handle);
CREATE INDEX idx_episodes_founder_names_trgm ON episodes USING gin (founder_names gin_trgm_ops);
CREATE INDEX idx_episodes_topics ON episodes USING gin (topics);

-- 2. Per-user favorites (founders, channels, topics — one polymorphic table)
CREATE TABLE user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('founder','channel','topic')),
  value text NOT NULL,           -- normalized lowercase
  display_name text NOT NULL,    -- "Y Combinator", "Elon Musk", "Marketing"
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, kind, value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON user_favorites TO authenticated;
GRANT ALL ON user_favorites TO service_role;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON user_favorites FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

A canonical topic vocabulary (~20 entries: Marketing, Sales, Fundraising, Hiring, Product, Growth, Operations, Leadership, AI, Engineering, Design, Pricing, Distribution, Community, Bootstrapping, Enterprise, Brand, PMF, Strategy, Culture) lives in `src/lib/topics.ts`. The analyzer picks 1–3 from this fixed list — no free-text topic explosion.

### B. Edge function (`analyze-episode`)

Already returns a structured analysis. Extend the prompt to also return:

```json
{ "channel_name": "...", "channel_handle": "...", "topics": ["Marketing","Growth"] }
```

For YouTube, prefer the canonical channel from oEmbed (`author_name` + `author_url`) over the LLM. For TikTok/Instagram/X, use the `@handle` from the canonical URL. Write `channel_name`, `channel_handle`, `topics` to `episodes` on insert/update.

### C. Backfill

One-time admin route (or `pg_notify` job) that re-walks existing rows: re-runs metadata fetch + a cheap topic-only LLM call for `topics`. Idempotent — skip rows already populated.

### D. UI — `/library` (renamed from current Episodes list)

Left rail (sticky on desktop, drawer on mobile):

```
★ Favorites
  • Y Combinator (channel) — 14
  • Elon Musk (founder) — 9
  • Marketing (topic) — 23
─────────────────
Browse by
  Founders ▸
  Channels ▸
  Topics ▸
All videos
```

- Clicking a favorite filters the right-pane list (`episodes.where(channel_handle = $1 OR founder_names ilike %$1% OR $1 = ANY(topics))`).
- "Browse by Founders/Channels/Topics" expands to faceted counts derived from the user's own analyzed library (`group by`).
- A ★ icon on every facet row and every episode card toggles `user_favorites`.
- Free users: rail shows facets but ★ buttons open the Pro upsell modal (reuses existing `useSubscription` + paywall).

### E. Paywall

`user_favorites` writes are gated by `user_has_paid_plan(auth.uid())` in the RLS `WITH CHECK`. Reads stay open so we can show their current pins even if they downgrade.

## Files

**New**
- `supabase/migrations/<ts>_favorites_and_facets.sql`
- `src/lib/topics.ts` — canonical topic list + helpers
- `src/hooks/useFavorites.ts`
- `src/hooks/useLibraryFacets.ts` — groups user's episodes by founder/channel/topic
- `src/components/library/FavoritesRail.tsx`
- `src/components/library/FacetGroup.tsx`
- `src/components/library/FavoriteStar.tsx` (Pro-gated)

**Modified**
- `supabase/functions/analyze-episode/index.ts` — emit `channel_*` + `topics`, persist them
- `supabase/functions/_shared/transcript.ts` — surface `author_url` (channel handle) from oEmbed
- `src/pages/Library.tsx` (or current episodes page) — mount `FavoritesRail` + facet filtering
- `src/components/EpisodeCard.tsx` — ★ button + channel/founder/topic chips
- Mobile bottom nav: add Favorites entry for Pro users

## Out of scope
- No new payment SKU — uses existing Pro tier.
- No social/shared favorites — strictly per-user.
- No notifications when a favorited channel posts a new video (good follow-up later).

## Rollout
1. Migration + backfill script.
2. Edge-function update (so all new analyses are tagged).
3. UI rail + ★ buttons behind Pro gate.
4. Verify on `test@test.com` (Pro): favorite Y Combinator, favorite Elon Musk, filter by Marketing, confirm counts match `episodes`.
