import { m, useScroll, useSpring, useLandingScrollRef } from "@/components/marketing/motion";

/** Hairline reading-progress bar pinned to the very top of the viewport. */
export const ScrollProgress = () => {
  const container = useLandingScrollRef() ?? undefined;
  const { scrollYProgress } = useScroll({ container });
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  return (
    <m.div
      aria-hidden
      className="fixed left-0 right-0 z-[60] h-[2px] origin-left"
      style={{
        top: "var(--safe-area-top)",
        scaleX,
        background:
          "linear-gradient(90deg, hsl(var(--primary)), hsl(199 90% 60%), hsl(224 90% 55%))",
      }}
    />
  );
};
