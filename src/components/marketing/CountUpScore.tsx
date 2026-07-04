import { useEffect } from "react";
import {
  m,
  animate,
  useMotionValue,
  useTransform,
  EASE_OUT_EXPO,
} from "@/components/marketing/motion";

interface CountUpScoreProps {
  label: string;
  value: number;
  /** Start delay in seconds. */
  delay?: number;
}

/**
 * ScorePill (mirrors the product's EpisodeDetail pill) whose number counts
 * up 0→value. The MotionValue renders directly, so counting never re-renders
 * React per frame.
 */
export const CountUpScore = ({ label, value, delay = 0.15 }: CountUpScoreProps) => {
  const raw = useMotionValue(0);
  const rounded = useTransform(raw, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(raw, value, {
      duration: 0.8,
      delay,
      ease: EASE_OUT_EXPO,
    });
    return () => controls.stop();
  }, [raw, value, delay]);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
      {label}
      <span className="font-semibold tabular-nums">
        <m.span>{rounded}</m.span>/10
      </span>
    </span>
  );
};
