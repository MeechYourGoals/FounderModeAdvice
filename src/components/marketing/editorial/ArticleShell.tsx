import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Editorial page shell used by /scenarios, /scenarios/:slug, /blog, /blog/:slug.
 * A single ambient primary radial + a max-width container. Deliberately does
 * NOT ship the landing's nav/footer — the pages compose those themselves so
 * they can pass different navigate handlers.
 */
export const ArticleShell = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <main
    className={cn(
      "relative min-h-screen bg-background text-foreground",
      className,
    )}
  >
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
      style={{
        background:
          "radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--primary) / 0.09), transparent 70%)",
      }}
    />
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-28 pb-24">
      {children}
    </div>
  </main>
);
