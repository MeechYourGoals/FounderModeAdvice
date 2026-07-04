import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { Scenario } from "@/lib/content/scenarios";
import { m, cardChild } from "@/components/marketing/motion";

export const ScenarioCard = ({ scenario }: { scenario: Scenario }) => (
  <m.article variants={cardChild} className="h-full">
    <Link
      to={`/scenarios/${scenario.slug}`}
      className="group relative flex h-full flex-col rounded-2xl panel-hairline p-6 sm:p-7 transition-colors hover:border-primary/40"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/90">
        {scenario.persona}
      </p>
      <h3 className="mt-4 text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-foreground">
        {scenario.cardTitle}
      </h3>
      <p className="mt-3 text-[15px] leading-relaxed text-foreground/75">
        {scenario.cardTagline}
      </p>
      <span className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary link-sweep">
        {scenario.cardCtaLabel}
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </Link>
  </m.article>
);
