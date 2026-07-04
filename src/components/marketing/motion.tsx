/**
 * Motion foundation for the marketing landing surface.
 *
 * Every marketing component imports motion primitives from THIS module —
 * never from "motion/react" directly — so the whole page shares one spring
 * vocabulary and the import surface stays auditable (LazyMotion `strict`
 * guarantees nobody ships the full `motion` component by accident).
 *
 * NOTE: animations run for everyone. The owner deliberately removed
 * prefers-reduced-motion gating from the marketing surface (commit
 * "Reversed reduced motion") — do not re-add it here.
 */
import { createContext, useContext, type ReactNode, type RefObject } from "react";
import { LazyMotion, domAnimation, m, type Variants, type MotionValue } from "motion/react";

export type MotionValueNumber = MotionValue<number>;
export type { Variants };

export { m, AnimatePresence } from "motion/react";
export {
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
  useInView,
  animate,
} from "motion/react";

export const MotionProvider = ({ children }: { children: ReactNode }) => (
  <LazyMotion features={domAnimation} strict>
    {children}
  </LazyMotion>
);

/**
 * The landing page scrolls inside the `.despia-scroll` div, not the window.
 * Every scroll-linked hook on this surface must read from this container —
 * grab it with useLandingScrollRef() and pass `{ container }` to useScroll.
 */
export const LandingScrollContext = createContext<RefObject<HTMLDivElement> | null>(null);
export const useLandingScrollRef = () => useContext(LandingScrollContext);

/* ---------------------------------------------------------------- timing */

/** UIKit sheet curve — matches Tailwind's `ease-ios`. */
export const EASE_IOS = [0.32, 0.72, 0, 1] as const;
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** Smooth structural moves (cards settling, nav condensing). */
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;
/** Punchy accents (badges, chips, CTA presses, comment pop). */
export const SPRING_POP = { type: "spring", stiffness: 420, damping: 26 } as const;

/** Fire entrance once, when ~30% of the element clears the viewport bottom. */
export const VIEWPORT_ONCE = { once: true, amount: 0.3, margin: "0px 0px -60px 0px" } as const;

/* -------------------------------------------------------------- variants */

export const fadeRise = (y = 28, delay = 0): Variants => ({
  hidden: { opacity: 0, y },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_IOS, delay } },
});

export const scaleIn = (delay = 0): Variants => ({
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: { ...SPRING_SOFT, delay } },
});

export const staggerParent = (stagger = 0.1, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
});

/** Child variant for staggerParent groups. */
export const riseChild: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_IOS } },
};

/** Card child with a settle-scale, for grids of panels. */
export const cardChild: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: SPRING_SOFT },
};

/** Pop-in child for icon chips / badges nested inside cards. */
export const popChild: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: SPRING_POP },
};

/* ------------------------------------------------------------ components */

interface MRevealProps {
  children: ReactNode;
  className?: string;
  /** Entrance delay in seconds. */
  delay?: number;
  /** Initial rise distance in px. */
  y?: number;
}

/** Scroll-entrance wrapper — the landing-side successor to <Reveal>. */
export const MReveal = ({ children, className, delay = 0, y = 28 }: MRevealProps) => (
  <m.div
    className={className}
    variants={fadeRise(y, delay)}
    initial="hidden"
    whileInView="visible"
    viewport={VIEWPORT_ONCE}
  >
    {children}
  </m.div>
);
