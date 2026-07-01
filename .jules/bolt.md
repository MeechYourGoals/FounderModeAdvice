## 2025-05-14 - [EpisodesTable & useMediaQuery Optimizations]
**Learning:** In `EpisodesTable.tsx`, multiple `useMemo` hooks were iterating over the same `allEpisodes` array to generate facet counts and tag mappings. Consolidating these into a single $O(n)$ pass significantly reduces computational overhead. Additionally, replacing $O(n)$ `.find()` lookups within loops with $O(1)$ Map lookups prevents quadratic-like complexity during rendering.

In `useMediaQuery.ts`, the `useEffect` was re-attaching event listeners on every match change because `matches` was in the dependency array. This caused unnecessary churn in the browser's event system.

**Action:**
- Always look for opportunities to merge multiple passes over the same dataset into one.
- Prefer Maps over `.find()` for lookups within render loops or other `useMemo` hooks.
- Ensure `useMediaQuery` listeners are stable and only depend on the query string, not the resulting match state.
