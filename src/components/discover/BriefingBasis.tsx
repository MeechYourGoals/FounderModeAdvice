import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { BriefingStats } from "@/lib/briefingDiagnosis";
import { cn } from "@/lib/utils";

interface BriefingBasisProps {
  stats: BriefingStats | null | undefined;
  companyName: string | null | undefined;
}

/**
 * "How this briefing was built."
 *
 * The engine searches a founder's *industry and subject matter*, never their
 * company name — searching "Golf Ready" would return news about them rather
 * than anything to learn from. That is the right behaviour and it was entirely
 * invisible, which made a thin or off-target briefing impossible to interpret.
 * Showing the actual queries turns "why am I getting this?" into something the
 * user can check, and makes a too-generic query plan self-reporting.
 */
export function BriefingBasis({ stats, companyName }: BriefingBasisProps) {
  const [open, setOpen] = useState(false);

  const queries = stats?.query_plan?.map((entry) => entry.q).filter(Boolean) ?? [];
  const terms = stats?.context_terms?.filter(Boolean) ?? [];
  if (queries.length === 0 && terms.length === 0) return null;

  const company = companyName?.trim() || "your company";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <Search className="h-3.5 w-3.5" />
        How this briefing was built
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
        {queries.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Searches run for {company}</p>
            <div className="flex flex-wrap gap-1.5">
              {queries.map((query) => (
                <span
                  key={query}
                  className="rounded-md bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  {query}
                </span>
              ))}
            </div>
          </div>
        )}
        {terms.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Topics matched from your profile</p>
            <p className="text-xs text-muted-foreground">{terms.join(" · ")}</p>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Queries come from your industry, description, and stage — not your company name, so results
          are things to learn from rather than news about you. Edit the profile to steer them.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
