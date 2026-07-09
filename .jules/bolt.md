## 2026-07-08 - [Optimizing Episode Table Metadata Extraction]
**Learning:** Consolidating multiple `useMemo` passes (O(4N)) into a single pass (O(N)) and pre-calculating expensive derived data (like nested tags) into a hash map significantly reduces computation during filtering and sorting. Also, defining components inside the render loop is a major performance anti-pattern that prevents memoization.
**Action:** Always look for opportunities to batch metadata extraction from large arrays and ensure list items are defined outside the main component and wrapped in `React.memo`.
