import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { EditorialKicker } from "./EditorialKicker";

export type RelatedItem = {
  to: string;
  kicker: string;
  title: string;
  tagline?: string;
};

export const RelatedRail = ({
  heading,
  items,
}: {
  heading: string;
  items: RelatedItem[];
}) => {
  if (items.length === 0) return null;
  return (
    <section className="mt-24 border-t border-border/60 pt-12">
      <EditorialKicker>{heading}</EditorialKicker>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className="group flex flex-col rounded-2xl panel-hairline p-5 transition-colors hover:border-primary/40"
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary/90">
              {it.kicker}
            </p>
            <h3 className="mt-3 text-base font-semibold tracking-[-0.015em] text-foreground">
              {it.title}
            </h3>
            {it.tagline && (
              <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/70">
                {it.tagline}
              </p>
            )}
            <ArrowUpRight className="mt-4 h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
};
