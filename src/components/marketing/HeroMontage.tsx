import { useEffect, useRef, useState } from "react";
import { FolderCheck } from "lucide-react";
import {
  m,
  AnimatePresence,
  useInView,
  SPRING_POP,
  SPRING_SOFT,
  EASE_IOS,
} from "@/components/marketing/motion";
import { InsightCardDemo } from "@/components/marketing/InsightCardDemo";
import { CommentPop } from "@/components/marketing/CommentPop";
import {
  MONTAGE_CARDS,
  MONTAGE_FOLDER,
  MONTAGE_SOURCE,
  MONTAGE_TIMELINE,
} from "@/components/marketing/montageScript";

/**
 * Auto-playing insight montage — the product's output as the hero visual.
 * A phase state machine (chained timeouts) walks: source chip → three
 * insight cards spring in as a receding stack → a teammate comment with an
 * @mention pops onto the latest insight → the analysis files itself into a
 * folder → gentle idle float → crossfade and loop.
 *
 * The timeline only runs while the montage is in view; timers are cleared
 * when it scrolls away or unmounts, and each re-entry restarts at phase 0.
 */
export const HeroMontage = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.3 });
  const [phase, setPhase] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setPhase(0);
    const timers = MONTAGE_TIMELINE.map(({ at, phase: p }) =>
      window.setTimeout(() => {
        if (p === 6) {
          setCycle((c) => c + 1);
        } else {
          setPhase(p);
        }
      }, at),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [inView, cycle]);

  const visibleCards = MONTAGE_CARDS.filter((c) => phase >= c.phase);

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-[540px]">
      <AnimatePresence mode="wait">
        <m.div
          key={cycle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.45, ease: EASE_IOS } }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: EASE_IOS } }}
          className={phase >= 5 ? "animate-float-soft" : undefined}
        >
          {/* Source chip */}
          <m.div
            className="montage-card sheen relative mx-auto flex w-fit max-w-full items-center gap-2.5 overflow-hidden rounded-full px-4 py-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE_IOS }}
          >
            <span className="pulse-live h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
            <span className="truncate text-xs font-medium text-foreground/90">
              {MONTAGE_SOURCE.title}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {MONTAGE_SOURCE.duration}
            </span>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {phase >= 5 ? "Analyzed" : "Analyzing"}
            </span>
          </m.div>

          {/* Insight card stack */}
          <div className="relative mt-4 min-h-[240px] sm:min-h-[252px]">
            {visibleCards.map((card, idx) => {
              const depth = visibleCards.length - 1 - idx; // 0 = newest
              return (
                <m.div
                  key={card.phase}
                  className="absolute inset-x-0 top-0"
                  style={{ zIndex: 10 - depth, transformOrigin: "top center" }}
                  initial={{ opacity: 0, y: 44, scale: 0.96 }}
                  animate={{
                    opacity: depth === 0 ? 1 : depth === 1 ? 0.4 : 0.18,
                    y: depth * -16,
                    scale: 1 - depth * 0.05,
                  }}
                  transition={depth === 0 ? SPRING_POP : SPRING_SOFT}
                >
                  <InsightCardDemo card={card} active={depth === 0 || phase >= 4} />
                </m.div>
              );
            })}

            {/* Teammate comment attaches to the newest insight */}
            <AnimatePresence>
              {phase >= 4 && (
                <div className="absolute -right-2 sm:-right-6 top-[118px] z-20">
                  <CommentPop />
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Filed-away chip */}
          <div className="flex h-10 items-start justify-center">
            <AnimatePresence>
              {phase >= 5 && (
                <m.div
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                  initial={{ opacity: 0, y: 10, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={SPRING_POP}
                >
                  <FolderCheck className="h-3.5 w-3.5" />
                  {MONTAGE_FOLDER}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </m.div>
      </AnimatePresence>
    </div>
  );
};
