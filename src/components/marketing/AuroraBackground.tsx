/**
 * Living background for the marketing landing: three slow-drifting aurora
 * blobs in the brand blues, a masked grid, and film grain. Animation is pure
 * CSS keyframes (transform-only) — zero JS ticks, compositor-only work, so it
 * keeps moving smoothly while the page scrolls.
 */
export const AuroraBackground = () => (
  <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
    <div className="aurora-blob aurora-blob-1" />
    <div className="aurora-blob aurora-blob-2" />
    <div className="aurora-blob aurora-blob-3" />
    <div className="absolute inset-0 bg-grid opacity-[0.5]" />
    <div className="absolute inset-0 grain" />
  </div>
);
