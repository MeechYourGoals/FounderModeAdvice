import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { EditorialKicker } from "./EditorialKicker";
import { MReveal } from "@/components/marketing/motion";

export type Crumb = { name: string; to?: string };

export const ArticleHeader = ({
  kicker,
  title,
  dek,
  crumbs,
  meta,
}: {
  kicker: string;
  title: string;
  dek?: string;
  crumbs?: Crumb[];
  meta?: React.ReactNode;
}) => (
  <header className="max-w-3xl">
    {crumbs && crumbs.length > 0 && (
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-[12px] text-foreground/60"
      >
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {c.to ? (
              <Link to={c.to} className="hover:text-foreground transition-colors">
                {c.name}
              </Link>
            ) : (
              <span className="text-foreground/50">{c.name}</span>
            )}
            {i < crumbs.length - 1 && (
              <ChevronRight className="h-3 w-3 text-foreground/30" aria-hidden />
            )}
          </span>
        ))}
      </nav>
    )}
    <MReveal>
      <EditorialKicker>{kicker}</EditorialKicker>
      <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.025em] text-foreground">
        {title}
      </h1>
      {dek && (
        <p className="mt-6 text-[17px] sm:text-[19px] leading-relaxed text-foreground/80">
          {dek}
        </p>
      )}
      {meta && (
        <div className="mt-6 text-[13px] text-foreground/55">{meta}</div>
      )}
    </MReveal>
  </header>
);
