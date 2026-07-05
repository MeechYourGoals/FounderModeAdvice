import { useRef } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  m,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  animate,
  useLandingScrollRef,
  staggerParent,
  cardChild,
  VIEWPORT_ONCE,
  type MotionValueNumber,
} from "@/components/marketing/motion";

const STEPS = [
  {
    step: "01",
    title: "Paste a video",
    description:
      "Drop in any public founder, investor, or operator video. The source and transcript are pulled automatically.",
  },
  {
    step: "02",
    title: "Add company context",
    description:
      "Set your stage, industry, model, and the decision you're weighing — or analyze in universal mode.",
  },
  {
    step: "03",
    title: "Generate a memo",
    description:
      "Get an executive summary, key lessons, risks, action items, and founder questions — each cited to the source.",
  },
  {
    step: "04",
    title: "Save, ask, operationalize",
    description:
      "File it into a playbook, ask transcript follow-ups, and on Boardroom run one video across multiple business profiles in one go.",
  },
] as const;

const StepPanel = ({ step, title, description }: (typeof STEPS)[number]) => (
  <div className="panel-hairline card-lift relative h-full overflow-hidden rounded-2xl p-6">
    <span
      aria-hidden
      className="block font-mono text-[11px] uppercase tracking-[0.22em] text-primary/80 tabular-nums"
    >
      {step}
    </span>
    <h3 className="mt-3 font-semibold text-lg tracking-tight">{title}</h3>
    <p className="mt-1.5 text-[14.5px] text-foreground/80 leading-relaxed">{description}</p>
  </div>
);

/** One step in the sticky rail — highlights while its quarter of scroll is active.
 *  Hovering a card temporarily overrides scroll-driven dimming so the
 *  focused card always comes to prominence. */
const ScrubStep = ({
  progress,
  index,
  total,
  children,
}: {
  progress: MotionValueNumber;
  index: number;
  total: number;
  children: React.ReactNode;
}) => {
  const start = index / total;
  const end = (index + 1) / total;
  const baseOpacity = useTransform(
    progress,
    [start - 0.12, start, end, end + 0.12],
    [0.45, 1, 1, 0.45],
    { clamp: true },
  );
  const baseScale = useTransform(
    progress,
    [start - 0.12, start, end, end + 0.12],
    [0.965, 1.025, 1.025, 0.965],
    { clamp: true },
  );
  const hover = useMotionValue(0);
  const opacity = useTransform([baseOpacity, hover] as const, ([o, h]) => o + (1 - o) * h);
  const scale = useTransform([baseScale, hover] as const, ([s, h]) => s + (1.03 - s) * h);
  return (
    <m.div
      className="step-wrapper"
      style={{ opacity, scale }}
      onHoverStart={() => animate(hover, 1, { duration: 0.25 })}
      onHoverEnd={() => animate(hover, 0, { duration: 0.25 })}
    >
      {children}
    </m.div>
  );
};

/**
 * "How it works" storytelling. On large screens the four steps pin and
 * highlight one-by-one as the visitor scrolls through 220vh (all values are
 * MotionValues mapped straight to styles — zero React renders per frame).
 * Below lg it's a simple staggered stack.
 */
export const HowItWorksRail = () => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const railRef = useRef<HTMLDivElement>(null);
  const container = useLandingScrollRef() ?? undefined;
  const { scrollYProgress } = useScroll({
    container,
    target: railRef,
    offset: ["start start", "end end"],
  });
  const sprung = useSpring(scrollYProgress, { stiffness: 120, damping: 22, restDelta: 0.001 });

  if (!isDesktop) {
    return (
      <m.ol
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5"
        variants={staggerParent(0.09)}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
      >
        {STEPS.map((s) => (
          <m.li key={s.step} variants={cardChild} className="list-none">
            <StepPanel {...s} />
          </m.li>
        ))}
      </m.ol>
    );
  }

  return (
    <div ref={railRef} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-screen flex-col justify-center">
        <div className="relative mb-8 h-px w-full bg-border/50 overflow-hidden rounded-full">
          <m.div
            className="absolute inset-y-0 left-0 w-full origin-left rounded-full"
            style={{
              scaleX: sprung,
              background:
                "linear-gradient(90deg, hsl(var(--primary)), hsl(199 90% 60%))",
            }}
          />
        </div>
        <ol className="grid grid-cols-4 gap-5">
          {STEPS.map((s, i) => (
            <li key={s.step} className="list-none">
              <ScrubStep progress={sprung} index={i} total={STEPS.length}>
                <StepPanel {...s} />
              </ScrubStep>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
