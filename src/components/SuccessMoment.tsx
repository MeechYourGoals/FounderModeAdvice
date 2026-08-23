import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

/* Same palette as the onboarding finish confetti. */
const CONFETTI_DOTS = [
  { dx: -52, dy: -38, color: "hsl(211 100% 55%)" },
  { dx: 50, dy: -44, color: "hsl(38 92% 50%)" },
  { dx: -62, dy: 10, color: "hsl(142 71% 45%)" },
  { dx: 64, dy: 4, color: "hsl(356 84% 60%)" },
  { dx: -32, dy: 50, color: "hsl(271 91% 65%)" },
  { dx: 34, dy: 54, color: "hsl(199 90% 55%)" },
];

interface SuccessMomentProps {
  show: boolean;
  title: string;
  subtitle?: string;
  /** Called when the moment has played out (~2.6s). */
  onDone: () => void;
}

/**
 * A brief, non-blocking celebration overlay: spring-pop check, expanding
 * ring, confetti-lite burst, then gone. Used for one-time payoffs (first
 * memo finished). Purely decorative — never intercepts input.
 */
export const SuccessMoment = ({ show, title, subtitle, onDone }: SuccessMomentProps) => {
  useEffect(() => {
    if (!show) return;
    const timer = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(timer);
  }, [show, onDone]);

  if (!show) return null;

  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center"
    >
      <div className="animate-scale-in flex flex-col items-center gap-3 rounded-3xl bg-background/90 px-8 py-7 shadow-lg backdrop-blur-md border border-border/60">
        <div className="success-ring relative">
          <div className="success-pop relative flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-7 w-7" strokeWidth={3} />
          </div>
          {CONFETTI_DOTS.map((dot, i) => (
            <span
              key={i}
              className="confetti-dot"
              style={{ "--dx": `${dot.dx}px`, "--dy": `${dot.dy}px`, backgroundColor: dot.color } as React.CSSProperties}
            />
          ))}
        </div>
        <div className="text-center">
          <p className="text-headline">{title}</p>
          {subtitle && <p className="mt-0.5 text-footnote text-foreground-tertiary">{subtitle}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
};
