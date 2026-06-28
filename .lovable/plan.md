
## Smart Favorites v2

Five upgrades to the Favorites + Library facet system. All Pro-gated reads stay open; writes still require `user_has_paid_plan()`.

### 1. Topic shortcut tabs (Marketing / Hiring / Competitors / Fundraising)

- Add four pinned shortcut tabs at the top of the Library and on `/favorites`.
- "Competitors" isn't currently canonical — add it to `CANONICAL_TOPICS` in `src/lib/topics.ts` and to the analyzer enum in `supabase/functions/analyze-episode/index.ts`.
- Each tab links to `/library?topics=Marketing` (etc). No folder required — filters from `episodes.topics` array directly.
- Shortcut tabs render even when zero matches exist, with an empty state CTA: "Analyze a video tagged Marketing to populate this view."

### 2. Multi-select pin intersection

- Replace single-pin selection with a `Set<favoriteId>` in URL state (`?pins=ch:ycombinator,founder:elon-musk,topic:Marketing`).
- Filter logic in `useLibraryFacets`: episode must match **every** selected pin (AND across facet types, AND within a facet type too — strict intersection).
- Pin chip row shows selected pins with an `×` to remove individually and "Clear all".
- Star toggle on a row still adds/removes from saved favorites; pin toggle is a separate click target on the chip.

### 3. Favorites management drawer

- New `src/components/favorites/FavoritesDrawer.tsx` opened from a gear icon in the Favorites hub and the Library facet bar.
- Uses shadcn `Sheet` (right side).
- Per favorite: rename (writes `display_name` override), drag-reorder (writes `sort_order`), remove.
- Requires schema additions on `user_favorites`: `display_name text`, `sort_order integer default 0`.

### 4. Saved facet collections + sidebar

- New table `favorite_collections (id, user_id, name, pins jsonb, sort_order, created_at, updated_at)`.
  - `pins` shape: `[{ kind: 'channel'|'founder'|'topic', value: string }]`.
- "Save current filters" button in the pin chip row → prompts for name → inserts row.
- New left sidebar section "Collections" on `/favorites` and `/library` listing saved collections; click loads pins into URL.
- Inline rename + delete in sidebar. Paid-plan gated for writes.

### 5. Founder entity de-duplication

- New table `founder_aliases (id, canonical_name text, alias text unique, created_at)` seeded with common cases (Elon Musk / @elonmusk / elon, Paul Graham / pg, etc).
- Add `founders text[]` to `episodes` (already extracted by analyzer into lessons/insights — promote to first-class column).
- Update analyzer to: extract founders from transcript → normalize each through `founder_aliases` (insert new canonical row if unknown) → store canonical names in `episodes.founders`.
- `useLibraryFacets` groups founders by canonical name so favoriting "Elon Musk" matches episodes tagged `@elonmusk`, `elon musk`, `Elon`.
- Backfill: one-shot SQL pass mapping existing `lessons.speaker` / insights data into `episodes.founders` via the alias table.

### Technical details

**Migration**
```sql
-- favorites enhancements
alter table public.user_favorites
  add column if not exists display_name text,
  add column if not exists sort_order integer not null default 0;

-- collections
create table public.favorite_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  pins jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.favorite_collections to authenticated;
grant all on public.favorite_collections to service_role;
alter table public.favorite_collections enable row level security;
create policy "own collections read" on public.favorite_collections for select to authenticated using (auth.uid() = user_id);
create policy "own collections write" on public.favorite_collections for all to authenticated
  using (auth.uid() = user_id and public.user_has_paid_plan(auth.uid()))
  with check (auth.uid() = user_id and public.user_has_paid_plan(auth.uid()));

-- founder canonicalization
create table public.founder_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  alias text not null unique,
  created_at timestamptz not null default now()
);
create index on public.founder_aliases (canonical_name);
grant select on public.founder_aliases to authenticated, anon;
grant all on public.founder_aliases to service_role;
alter table public.founder_aliases enable row level security;
create policy "aliases readable" on public.founder_aliases for select to authenticated, anon using (true);

alter table public.episodes add column if not exists founders text[] not null default '{}';
create index if not exists episodes_founders_gin on public.episodes using gin(founders);
```

**Files touched**
- `src/lib/topics.ts` — add `Competitors`.
- `src/lib/founders.ts` (new) — `normalizeFounder()` using cached alias table.
- `src/hooks/useFavorites.ts` — add rename / reorder / collection CRUD.
- `src/hooks/useLibraryFacets.ts` — multi-pin intersection, canonical-name grouping, topic-tab shortcuts.
- `src/pages/Favorites.tsx` + `src/pages/Index.tsx` — shortcut tabs, sidebar, drawer trigger, pin chip row.
- `src/components/favorites/FavoritesDrawer.tsx` (new) — manage pins.
- `src/components/favorites/CollectionsSidebar.tsx` (new).
- `src/components/favorites/PinChips.tsx` (new).
- `supabase/functions/analyze-episode/index.ts` + `_shared/founders.ts` (new) — founder extraction + alias upsert + canonical storage.

**Rollout**
1. Migration (schema + seed aliases for ~30 well-known founders).
2. Edge function update + backfill SQL for existing episodes.
3. Frontend in one batch: hooks → components → page wiring.
4. Smoke test on `test@test.com`: create 2 pins, save as collection, switch collection, rename a favorite, click Marketing tab.

Ship as one cohesive release — these features depend on each other (intersection needs collections to be worth saving, drawer needs sort_order, topic tabs need Competitors in the enum).
