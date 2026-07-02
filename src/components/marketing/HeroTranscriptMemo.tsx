import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Signature Founder Mode Advice hero: a scroll-driven Transcript → Decision Memo
 * transformation. The container reserves ~180vh of scroll room; the inner grid
 * is sticky-pinned to the viewport and the left artifact re-renders as the
 * user scrolls, cycling through five stages:
 *
 *   0 transcript  → 1 citations → 2 risks → 3 actions → 4 memo
 *
 * The right column (headline + CTAs) is deliberately static so the eye tracks
 * the transformation and the copy never fights the animation.
 *
 * Reduced-motion: the sticky container collapses to a normal-height section
 * and the artifact locks to the final memo stage.
 */

const TRANSCRIPT_LINES = [
  { t: "00:12", text: "\u201cWe went from three enterprise pilots to twenty in eighteen months\u2026\u201d" },
  { t: "00:41", text: "\u201cThe unlock wasn\u2019t the product. It was tightening the ICP to one persona.\u201d" },
  { t: "01:07", text: "\u201cWe hired a VP of Sales too early. That set us back two quarters.\u201d" },
  { t: "01:34", text: "\u201cPricing was the biggest lever \u2014 we doubled ACV without losing a single logo.\u201d" },
  { t: "02:05", text: "\u201cIf I were doing this again, I\u2019d run the founder-led motion for another year.\u201d" },
];

const CITATIONS = [
  { t: "00:41", label: "ICP tightening drove pilot velocity" },
  { t: "01:34", label: "Repricing doubled ACV, zero churn" },
  { t: "02:05", label: "Founder-led sales worked longer than expected" },
];

const RISKS = [
  "Hiring a VP of Sales before repeatable motion cost two quarters.",
  "Broad ICP diluted the pilot pipeline before the reset.",
];

const ACTIONS = [
  "Cut ICP to one persona; re-score current pipeline this week.",
  "Model a 1.8\u20132.2\u00d7 price test on next two deals.",
  "Delay VP Sales hire until 3 reps hit quota back-to-back.",
];

const FOUNDER_QUESTION =
  "What would break in our motion if we tightened ICP to one persona for the next two quarters?";

type Stage = 0 | 1 | 2 | 3 | 4;

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const HeroTranscriptMemo = ({
  onPrimary,
  onSecondary,
}: {
  onPrimary: () => void;
  onSecondary: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState<Stage>(0);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (prefersReduced()) {
      setReduced(true);
      setStage(4);
      setProgress(1);
      return;
    }

    let ticking = false;
    const update = () => {
      ticking = false;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Progress across the scroll travel of the sticky container.
      const total = rect.height - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = total > 0 ? scrolled / total : 0;
      setProgress(p);
      // 5 stages evenly distributed across the scroll travel.
      const s = Math.min(4, Math.floor(p * 5)) as Stage;
      setStage(s);
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ minHeight: reduced ? undefined : "220vh" }}
    >
      <div className="sticky top-0 h-screen min-h-[720px] flex items-center overflow-hidden">
        {/* Ambient background: single deep-navy field + one anchored glow.
            Intentionally NOT a grid, NOT a mesh — different from the previous
            hero (and from every SeatMap-style landing). */}
        <div aria-hidden className="absolute inset-0 hero-field" />
        <div aria-hidden className="absolute inset-0 hero-glow" />

        <div className="container relative mx-auto grid grid-cols-1 gap-10 px-4 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:items-center">
          {/* Left: transforming artifact */}
          <div className="relative order-2 lg:order-1">
            <ArtifactStack stage={stage} progress={progress} reduced={reduced} />
          </div>

          {/* Right: static copy anchor */}
          <div className="relative order-1 lg:order-2 lg:pl-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/90">
              Transcript-grounded founder intelligence
            </p>
            <h1 className="mt-5 text-[2.6rem] sm:text-[3.4rem] lg:text-[4.1rem] leading-[1.02] font-semibold tracking-[-0.03em] text-foreground">
              Build your boardroom, then instill their insights.
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-foreground/85">
              Paste a founder, investor, or operator video. Watch the transcript
              become citations, risks, actions, and a decision memo tailored to
              the call you have to make next.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="h-12 rounded-full px-7 text-base"
                onClick={onPrimary}
              >
                Analyze a video
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="h-12 rounded-full px-6 text-base link-sweep"
                onClick={onSecondary}
              >
                See the decisions it improves
              </Button>
            </div>
            <p className="mt-6 text-sm text-foreground/60">
              Free analysis · no card required · web, iOS, Android
            </p>

            {/* Stage indicator — five ticks that fill as the user scrolls.
                Doubles as a legend for what the artifact is doing. */}
            <div className="mt-10 hidden lg:flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-foreground/50">
              {["Transcript", "Citations", "Risks", "Actions", "Memo"].map(
                (label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <span
                      className={`h-[2px] w-6 transition-colors duration-300 ${
                        i <= stage ? "bg-primary" : "bg-foreground/15"
                      }`}
                    />
                    <span
                      className={
                        i === stage ? "text-primary" : "text-foreground/45"
                      }
                    >
                      {label}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------------ */

const ArtifactStack = ({
  stage,
  progress,
  reduced,
}: {
  stage: Stage;
  progress: number;
  reduced: boolean;
}) => {
  // Fade the transcript out as we move past stage 0; fade the memo in past stage 3.
  const transcriptOpacity = reduced ? 0.35 : Math.max(0.15, 1 - progress * 1.6);
  const memoOpacity = reduced ? 1 : Math.min(1, Math.max(0, (progress - 0.55) / 0.35));

  return (
    <div className="relative mx-auto w-full max-w-[520px] aspect-[4/5] sm:aspect-[5/6]">
      {/* Transcript panel — always present, fades under */}
      <div
        className="panel-hairline absolute inset-0 rounded-2xl p-5 sm:p-6 overflow-hidden transition-opacity duration-500"
        style={{ opacity: transcriptOpacity }}
        aria-hidden
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/50">
            Transcript
          </span>
          <span className="flex items-center gap-2 text-[10px] text-foreground/50">
            <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-live" />
            Ingesting
          </span>
        </div>
        <div className="space-y-3 font-mono text-[12px] leading-relaxed text-foreground/70">
          {TRANSCRIPT_LINES.map((line, i) => (
            <p
              key={line.t}
              className={i === 1 || i === 3 ? "sheen text-foreground/90" : ""}
            >
              <span className="text-primary/80 mr-2">{line.t}</span>
              {line.text}
            </p>
          ))}
        </div>
      </div>

      {/* Layer 1: Citations */}
      <ArtifactLayer active={stage >= 1 && stage < 4}>
        <LayerHeader label="Citations" count={CITATIONS.length} />
        <div className="mt-4 space-y-2.5">
          {CITATIONS.map((c) => (
            <div
              key={c.t}
              className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5"
            >
              <span className="mt-0.5 rounded-md bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary tabular-nums">
                {c.t}
              </span>
              <span className="text-[13px] leading-snug text-foreground/90">
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </ArtifactLayer>

      {/* Layer 2: Risks */}
      <ArtifactLayer active={stage >= 2 && stage < 4}>
        <LayerHeader label="Risks" count={RISKS.length} tone="danger" />
        <ul className="mt-4 space-y-2.5">
          {RISKS.map((r) => (
            <li
              key={r}
              className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] leading-snug text-foreground/90"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              {r}
            </li>
          ))}
        </ul>
      </ArtifactLayer>

      {/* Layer 3: Actions */}
      <ArtifactLayer active={stage >= 3 && stage < 4}>
        <LayerHeader label="Actions" count={ACTIONS.length} />
        <ul className="mt-4 space-y-2.5">
          {ACTIONS.map((a) => (
            <li
              key={a}
              className="flex items-start gap-3 rounded-lg border border-border/70 bg-card/60 px-3 py-2.5 text-[13px] leading-snug text-foreground"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-primary/60 bg-primary/10">
                <span className="h-1.5 w-1.5 rounded-[1px] bg-primary" />
              </span>
              {a}
            </li>
          ))}
        </ul>
      </ArtifactLayer>

      {/* Layer 4: Assembled decision memo */}
      <div
        className="panel-hairline absolute inset-0 rounded-2xl p-5 sm:p-6 overflow-hidden bg-[hsl(var(--card)/0.85)] backdrop-blur-md transition-opacity duration-500"
        style={{ opacity: memoOpacity, pointerEvents: stage >= 4 ? "auto" : "none" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
              Decision brief
            </p>
            <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.01em]">
              Seed B2B SaaS · GTM reset
            </h3>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Grounded
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MemoStat label="Citations" value={String(CITATIONS.length)} />
          <MemoStat label="Risks" value={String(RISKS.length)} tone="danger" />
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
            Do this next
          </p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-snug text-foreground/90">
            {ACTIONS.slice(0, 3).map((a) => (
              <li key={a} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            Founder question
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-foreground/95">
            {FOUNDER_QUESTION}
          </p>
        </div>
      </div>
    </div>
  );
};

const ArtifactLayer = ({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) => (
  <div
    className="panel-hairline absolute inset-0 rounded-2xl p-5 sm:p-6 overflow-hidden bg-[hsl(var(--card)/0.72)] backdrop-blur-md transition-all duration-500"
    style={{
      opacity: active ? 1 : 0,
      transform: active ? "translateY(0)" : "translateY(12px)",
      pointerEvents: active ? "auto" : "none",
    }}
    aria-hidden={!active}
  >
    {children}
  </div>
);

const LayerHeader = ({
  label,
  count,
  tone = "primary",
}: {
  label: string;
  count: number;
  tone?: "primary" | "danger";
}) => (
  <div className="flex items-center justify-between">
    <span
      className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${
        tone === "danger" ? "text-destructive" : "text-primary"
      }`}
    >
      {label}
    </span>
    <span className="text-[10px] tabular-nums text-foreground/50">
      {String(count).padStart(2, "0")}
    </span>
  </div>
);

const MemoStat = ({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: string;
  tone?: "primary" | "danger";
}) => (
  <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
    <p
      className={`text-[9.5px] font-semibold uppercase tracking-[0.22em] ${
        tone === "danger" ? "text-destructive" : "text-primary/90"
      }`}
    >
      {label}
    </p>
    <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
      {value}
    </p>
  </div>
);
