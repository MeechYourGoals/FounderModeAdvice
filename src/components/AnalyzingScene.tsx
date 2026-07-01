import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The wait for an analysis is the emotional peak of the product — treat it
 * like a scene, not a spinner. A staged narrative advances on a timeline
 * tuned to typical server latency (the last stage holds until the request
 * settles), while a skeleton of the memo visibly materializes section by
 * section below it.
 */
const STAGES = [
  { label: "Pulling the transcript", at: 0 },
  { label: "Extracting lessons & risks", at: 6_000 },
  { label: "Mapping to your company", at: 14_000 },
  { label: "Writing your memo", at: 24_000 },
] as const;

export const AnalyzingScene = ({
  companyName,
  batchLabel,
}: {
  /** Personalization target shown in stage 3, e.g. "Acme Robotics". */
  companyName?: string | null;
  /** Overrides the narrative subtitle during multi-profile batch runs. */
  batchLabel?: string;
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeIndex = STAGES.reduce((acc, stage, i) => (elapsed >= stage.at ? i : acc), 0);

  return (
    <div className="space-y-8 py-2" role="status" aria-live="polite" aria-label="Analyzing video">
      {/* Staged narrative */}
      <ol className="mx-auto w-full max-w-sm space-y-3">
        {STAGES.map((stage, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          const label =
            i === 2 && companyName ? `Mapping to ${companyName}` : stage.label;
          return (
            <li
              key={stage.label}
              className={cn(
                "flex items-center gap-3 transition-all duration-500",
                done && "text-foreground-tertiary",
                active && "text-foreground",
                !done && !active && "text-foreground-quaternary",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-500",
                  done && "bg-success/15 text-success",
                  active && "bg-primary/15 text-primary",
                  !done && !active && "bg-muted/60",
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                )}
              </span>
              <span className={cn("text-subhead", active && "font-medium")}>{label}</span>
            </li>
          );
        })}
      </ol>

      {batchLabel && (
        <p className="text-center text-footnote text-foreground-tertiary">{batchLabel}</p>
      )}

      {/* The memo materializing — sections appear as stages complete */}
      <div className="mx-auto w-full max-w-xl space-y-5" aria-hidden>
        <div className="space-y-2.5">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
        </div>
        {activeIndex >= 1 && (
          <div className="space-y-2.5 animate-slide-up">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
            <div className="flex gap-2 pt-0.5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        )}
        {activeIndex >= 2 && (
          <div className="space-y-2.5 animate-slide-up">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-10/12" />
          </div>
        )}
        {activeIndex >= 3 && (
          <div className="space-y-2.5 animate-slide-up">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3.5 w-9/12" />
          </div>
        )}
      </div>

      <p className="text-center text-footnote text-foreground-tertiary">
        Usually under a minute · we'll keep working if you switch screens
      </p>
    </div>
  );
};
