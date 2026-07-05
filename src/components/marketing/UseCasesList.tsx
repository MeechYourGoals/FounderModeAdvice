import { ArrowUpRight } from "lucide-react";
import {
  m,
  staggerParent,
  riseChild,
  VIEWPORT_ONCE,
  EASE_IOS,
} from "@/components/marketing/motion";

/**
 * Editorial two-column use-cases list. Deliberately not a card grid — the
 * previous "3-card row" collapsed into the surrounding sections and made the
 * "decisions founders actually face" beat invisible. This layout makes it a
 * first-class section.
 */
export const UseCasesList = ({
  onSelect,
}: {
  onSelect: () => void;
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16">
      <m.div
        initial={{ opacity: 0, x: -24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: 0.7, ease: EASE_IOS }}
      >
        <div className="lg:sticky lg:top-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary eyebrow-rule left">
            Use cases
          </p>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.025em] text-foreground">
            The decisions founders actually face.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-foreground/80 max-w-md">
            Every analysis is scoped to a specific decision — not a generic
            summary of what the speaker said. Choose the workstream you're
            in, then paste the source.
          </p>
        </div>
      </m.div>

      <m.ul
        className="divide-y divide-border/60 border-y border-border/60"
        variants={staggerParent(0.06)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        {USE_CASES.map((u, i) => (
          <m.li key={u.title} variants={riseChild}>
              <button
                type="button"
                onClick={onSelect}
                className="use-case-row group w-full flex items-start gap-5 py-5 sm:py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-md"
              >
                <span className="use-case-index shrink-0 mt-1 font-mono text-[11px] tabular-nums text-foreground/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold tracking-[-0.015em] text-foreground">
                    {u.title}
                  </h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-foreground/75">
                    {u.description}
                  </p>
                </div>
                <ArrowUpRight
                  className="mt-1 h-5 w-5 shrink-0 text-foreground/30 transition-all duration-300 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </button>
          </m.li>
        ))}
      </m.ul>
    </div>
  );
};

const USE_CASES = [
  {
    title: "Fundraising prep",
    description:
      "Walk into the raise with the narrative, metrics, and objections investors actually probe \u2014 sourced from operators who\u2019ve raised the round you\u2019re raising.",
  },
  {
    title: "GTM strategy",
    description:
      "Pressure-test your motion before you spend the next quarter committing to it. Founder-led vs. sales-led, ICP width, pilot design.",
  },
  {
    title: "Hiring & org design",
    description:
      "Learn which roles to hire \u2014 and which to delay \u2014 from operators who\u2019ve done it. Avoid the VP-too-early trap.",
  },
  {
    title: "Product strategy",
    description:
      "Turn product talks into a sharper view of what to build, what to cut, and what to ship without regret in the next 90 days.",
  },
  {
    title: "Pricing decisions",
    description:
      "Borrow pricing logic from operators who\u2019ve repriced and lived with the result. Model the ACV lift before you send the term.",
  },
  {
    title: "Board prep",
    description:
      "Turn board-meeting wisdom into a tighter deck, crisper asks, and pre-mortemed risks your board will surface anyway.",
  },
] as const;
