## 2026-06-30 - [Optimize Library Facets and Media Query Hook]
**Learning:** Consolidating multiple useMemo hooks that iterate over the same large array into a single-pass useMemo significantly reduces O(N) operations during component re-renders. Additionally, removing state variables from useEffect dependency arrays in hooks like useMediaQuery prevents redundant listener re-attachments.
**Action:** Always check for multiple single-purpose useMemo hooks iterating over the same dataset and prefer a single-pass consolidation.
