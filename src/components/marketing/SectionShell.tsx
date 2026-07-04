import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  m,
  useScroll,
  useTransform,
  useLandingScrollRef,
  staggerParent,
  riseChild,
  VIEWPORT_ONCE,
} from "@/components/marketing/motion";

/**
 * Shared marketing section wrapper. Owns eyebrow + heading + lead composition
 * and the animated hairline divider that anchors each section, so the page
 * reads with one voice instead of ad-hoc card grids.
 */
export const SectionShell = ({
  id,
  eyebrow,
  title,
  lead,
  align = "left",
  children,
  className,
  bare = false,
  aura = false,
}: {
  id?: string;
  eyebrow?: string;
  title?: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  children?: ReactNode;
  className?: string;
  /** Skip the outer padding/container; only draw the divider + slot children. */
  bare?: boolean;
  /** Adds a scroll-parallax radial glow behind the section. Use sparingly. */
  aura?: boolean;
}) => {
  const centered = align === "center";
  const sectionRef = useRef<HTMLElement>(null);
  const container = useLandingScrollRef() ?? undefined;
  const { scrollYProgress } = useScroll({
    container,
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const auraY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section
      ref={sectionRef}
      id={id}
      className={cn(
        "relative scroll-mt-28",
        !bare && "px-4 sm:px-6 py-16 sm:py-24 md:py-28",
        className,
      )}
    >
      <div aria-hidden className="section-divider-animated" />
      {aura && (
        <m.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[420px] w-[min(720px,90vw)] -translate-x-1/2 rounded-full"
          style={{
            y: auraY,
            background: "radial-gradient(closest-side, hsl(var(--primary) / 0.1), transparent 72%)",
          }}
        />
      )}
      <div className="max-w-6xl mx-auto">
        {(eyebrow || title || lead) && (
          <m.header
            className={cn("mb-12 sm:mb-16 max-w-3xl", centered && "mx-auto text-center")}
            variants={staggerParent(0.09)}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
          >
            {eyebrow && (
              <m.p
                variants={riseChild}
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.24em] text-primary",
                  "eyebrow-rule",
                  !centered && "left",
                )}
              >
                {eyebrow}
              </m.p>
            )}
            {title && (
              <m.h2
                variants={riseChild}
                className="mt-5 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.025em] text-foreground"
              >
                {title}
              </m.h2>
            )}
            {lead && (
              <m.p
                variants={riseChild}
                className="mt-5 text-[15px] sm:text-[17px] leading-relaxed text-foreground/80"
              >
                {lead}
              </m.p>
            )}
          </m.header>
        )}
        {children}
      </div>
    </section>
  );
};
