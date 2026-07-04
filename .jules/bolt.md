## 2026-07-04 - Consolidating Derived State in Large Lists
**Learning:** In components like `EpisodesTable.tsx` that handle hundreds of items, multiple `useMemo` hooks each iterating over the full list (O(4N)) creates measurable lag during filter/sort updates. Consolidating into a single O(N) pass and pre-calculating expensive properties (like tags) during the fetch phase significantly improves interaction responsiveness.
**Action:** When a component derives multiple facets (unique founders, companies, years, tags) from a single list, always prefer a single consolidated `useMemo` iteration.
