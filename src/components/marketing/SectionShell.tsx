import type { ReactNode } from "react";
import { Reveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";

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
}) => {
  const centered = align === "center";
  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-24",
        !bare && "px-4 sm:px-6 py-16 sm:py-24 md:py-28",
        className,
      )}
    >
      <div aria-hidden className="section-divider-animated" />
      <div className="max-w-6xl mx-auto">
        {(eyebrow || title || lead) && (
          <header
            className={cn(
              "mb-12 sm:mb-16 max-w-3xl",
              centered && "mx-auto text-center",
            )}
          >
            {eyebrow && (
              <Reveal>
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.24em] text-primary",
                    "eyebrow-rule",
                    !centered && "left",
                  )}
                >
                  {eyebrow}
                </p>
              </Reveal>
            )}
            {title && (
              <Reveal delay={80}>
                <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.025em] text-foreground">
                  {title}
                </h2>
              </Reveal>
            )}
            {lead && (
              <Reveal delay={160}>
                <p className="mt-5 text-[15px] sm:text-[17px] leading-relaxed text-foreground/80">
                  {lead}
                </p>
              </Reveal>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );
};
