import { AlertTriangle, ArrowDownRight, Check, Play, Quote } from "lucide-react";

/**
 * Premium hero composition: a founder video (source + transcript) on the back
 * plane resolves into a structured operating memo on the front plane. Built
 * entirely from CSS / SVG / transforms — no 3D libraries, no heavy motion.
 * Illustrative sample data only; never represents a real analysis.
 */
export const HeroProductScene = () => {
  return (
    <div
      className="relative mx-auto w-full max-w-[34rem] select-none"
      style={{ perspective: "1800px" }}
      aria-hidden
    >
      {/* Ambient light behind the composition */}
      <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-primary/15 blur-3xl" />

      <div
        className="relative pt-10 sm:pt-14 lg:[transform:rotateX(4deg)_rotateY(-7deg)]"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ---- Back plane: the source video + transcript ---- */}
        <div className="absolute -top-1 left-0 hidden w-[64%] sm:block lg:[transform:translateZ(-60px)]">
          <SourcePanel />
        </div>

        {/* ---- Front plane: the operating memo ---- */}
        <div className="relative ml-auto w-full sm:w-[82%]">
          <MemoPanel />
        </div>
      </div>
    </div>
  );
};

const SourcePanel = () => (
  <div className="rounded-2xl border border-border/70 bg-card/95 p-3 shadow-lg backdrop-blur-sm">
    <div className="mb-2.5 flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/5 text-foreground/80">
        <Play className="h-3 w-3 fill-current" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-foreground/85">Operator interview</p>
        <p className="text-[10px] text-muted-foreground">YouTube · 42:18</p>
      </div>
    </div>

    {/* Faux video frame with scrubber */}
    <div className="relative mb-3 h-14 overflow-hidden rounded-lg bg-gradient-to-br from-foreground/10 via-primary/10 to-foreground/5">
      <div className="absolute inset-x-2 bottom-1.5 h-1 rounded-full bg-foreground/15">
        <div className="h-full w-1/3 rounded-full bg-primary/70" />
      </div>
    </div>

    {/* Transcript lines with timecodes — one is "cited" */}
    <div className="space-y-1.5">
      {[
        { t: "11:48", w: "w-full", cited: false },
        { t: "12:04", w: "w-[92%]", cited: true },
        { t: "12:31", w: "w-3/4", cited: false },
      ].map((l) => (
        <div key={l.t} className="flex items-center gap-2">
          <span className="font-mono text-[9px] tabular-nums text-muted-foreground/80">{l.t}</span>
          <div
            className={`sheen relative h-2 rounded-full ${l.w} ${
              l.cited ? "bg-primary/30 ring-1 ring-primary/40" : "bg-foreground/10"
            }`}
          />
        </div>
      ))}
    </div>
  </div>
);

const MemoPanel = () => (
  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-elegant)] ring-1 ring-border/40">
    {/* Brand hairline */}
    <div className="h-[3px] w-full" style={{ background: "var(--gradient-primary)" }} />

    <div className="p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Operating memo</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">
            Scaling a seed-stage GTM motion
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-foreground/75">
          Seed · B2B SaaS
        </span>
      </div>

      {/* Grounding status */}
      <div className="mt-2.5 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="pulse-live h-1.5 w-1.5 rounded-full bg-success" />
        <span>Transcript-grounded</span>
        <span className="text-muted-foreground/50">·</span>
        <span className="font-mono tabular-nums">47 citations</span>
      </div>

      {/* Memo body */}
      <div className="mt-4 space-y-2.5">
        <MemoRow
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          tone="risk"
          label="Risk"
          text="Hiring a VP of Sales before founder-led sales is repeatable."
          cite="12:04"
        />
        <MemoRow
          icon={<Check className="h-3.5 w-3.5" />}
          tone="action"
          label="Action"
          text="Run 10 founder-led closes; document the objections that recur."
          cite="18:30"
        />
        <MemoRow
          icon={<Quote className="h-3.5 w-3.5" />}
          tone="question"
          label="Founder question"
          text="What has to be true for our motion to survive a VP handoff?"
        />
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ArrowDownRight className="h-3.5 w-3.5 text-primary" />
          Saved to <span className="font-medium text-foreground/80">GTM</span> playbook
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Decision brief
        </span>
      </div>
    </div>
  </div>
);

const TONE: Record<string, { wrap: string; chip: string }> = {
  risk: { wrap: "text-amber-500/90", chip: "border-amber-500/25 bg-amber-500/5" },
  action: { wrap: "text-primary", chip: "border-primary/20 bg-primary/5" },
  question: { wrap: "text-muted-foreground", chip: "border-border bg-secondary/40" },
};

const MemoRow = ({
  icon,
  tone,
  label,
  text,
  cite,
}: {
  icon: React.ReactNode;
  tone: "risk" | "action" | "question";
  label: string;
  text: string;
  cite?: string;
}) => {
  const t = TONE[tone];
  return (
    <div className={`rounded-xl border ${t.chip} p-2.5`}>
      <div className="flex items-center gap-1.5">
        <span className={t.wrap}>{icon}</span>
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${t.wrap}`}>{label}</span>
        {cite && (
          <span className="ml-auto rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-muted-foreground">
            {cite}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-snug text-foreground/85">{text}</p>
    </div>
  );
};
