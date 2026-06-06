## Plan: Tag Filtering + Rebrand to "Founder Mode Advice"

### Part 1: Rebrand "Founder Lessons" → "Founder Mode Advice"

Replace text in:
- `index.html` — `<title>`, `apple-mobile-web-app-title`, `og:title`
- `vite.config.ts` — PWA manifest `name` + `short_name`
- `src/components/PublicLanding.tsx` — nav brand + footer
- `src/components/HeroSection.tsx` — H1 ("Founder Mode Advice")
- `src/pages/Index.tsx` — top bar brand
- `src/components/ExportModal.tsx` — markdown + PDF headers

### Part 2: Make the brand name a "home" link

In `src/pages/Index.tsx` (mobile/tablet top bar) and `PublicLanding.tsx` (nav), wrap the brand label in a button that:
- Clears the selected episode (`setSelectedEpisodeId(null)`)
- Resets tag/folder/founder/company/year filters via a small home reset
- Navigates to `/` (using `navigate("/")`)
- Scrolls the `.despia-scroll` container to top

For Index, the simplest reset: lift a `resetHome()` that sets `selectedEpisodeId=null` and dispatches a window event `homeReset` that `EpisodesTable` listens for to clear its filters and go to page 1.

### Part 3: Tag-based sort/filter for analyzed episodes

Data already loaded: each episode pulls `lessons.lesson_tags.tags(name)`. We will surface these tags as first-class filter chips.

**In `src/components/EpisodesTable.tsx`:**

1. **Derive `uniqueTags`** with counts from `allEpisodes` (flatten `lessons[].lesson_tags[].tags.name`, dedupe case-insensitively, sort by count desc).

2. **Add `selectedTags: Set<string>` state** (multi-select). Filter logic: episode passes if it has ≥1 lesson tag in `selectedTags` (OR semantics, matches existing industry chips). Reset to page 1 on change.

3. **Tag filter UI** — a horizontally scrollable chip bar above the table:
   - Label "Filter by tag:" with a "Clear" button when any selected
   - Each tag rendered as `<Badge variant={active?'default':'outline'}>` with count, click toggles selection
   - Show top 20 by count + a "More…" popover with full searchable list

4. **Clickable tags in episode rows** — in both the desktop table row and `MobileEpisodeCard`, render up to 3 tag chips per episode (from `episode.lessons[].lesson_tags[].tags.name`). Clicking a chip calls `toggleTag(name)` (stopPropagation so it doesn't open the episode) — this is the "click a tag to see all episodes with that tag" flow.

5. **Sort options** — extend the existing sort dropdown/headers with:
   - "Newest" / "Oldest" (chronological, by `release_date` falling back to `created_at`)
   - "Most tags" (count of unique tags per episode)
   - Existing title/company/founder/stage/industry retained

   Add a `SortColumn` value `"release_date"` and `"tag_count"`; on mobile expose via a small Select labeled "Sort".

6. **View modes** — add a 3-button toggle: **Chronological | By Tag | By Folder**.
   - Chronological: current flat list, default sort = newest first
   - By Tag: groups episodes by tag (sections with tag name + count, episode cards under each); if `selectedTags` set, only show those groups
   - By Folder: groups by user's `episode_folders` (existing folders system already wired); episodes with no folder appear under "Unfiled"

   Implemented as a `viewMode` state; render either the existing table/cards or grouped sections.

7. **URL sync** — read/write `?tags=foo,bar&view=tag` in `useSearchParams` so tag filter links are shareable and survive refresh (mirrors existing `?founder=` handling).

### Technical Notes

- No DB migration required — `tags`, `lesson_tags`, `lessons`, `episodes` already exist and are selected.
- Performance: tag derivation is O(n·m) over already-loaded episodes; fine for current paging (15/page, full list cached).
- Accessibility: tag chips get `role="button"`, `aria-pressed`, and keyboard handlers.
- Mobile: chip bar uses `overflow-x-auto` with snap; "By Tag" sections collapse-by-default with a chevron.

### Files Modified

| File | Change |
|---|---|
| `index.html` | Rename brand strings |
| `vite.config.ts` | PWA manifest rename |
| `src/components/PublicLanding.tsx` | Brand text + clickable home |
| `src/components/HeroSection.tsx` | H1 rename |
| `src/pages/Index.tsx` | Brand text, clickable home reset |
| `src/components/ExportModal.tsx` | Header strings rename |
| `src/components/EpisodesTable.tsx` | Tag chips, tag filter bar, view modes (chrono/tag/folder), sort by date/tag count, URL sync, listen for `homeReset` |
