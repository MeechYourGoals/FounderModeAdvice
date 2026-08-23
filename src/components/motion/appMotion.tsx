/**
 * Motion foundation for in-app surfaces (onboarding, celebratory moments).
 *
 * The marketing landing has its own module (components/marketing/motion.tsx);
 * this one carries the same spring vocabulary into the signed-in app without
 * coupling app screens to the landing's scroll-container context. Wrap any
 * subtree that uses `m.*` in <AppMotionProvider> — LazyMotion `strict`
 * guarantees nobody ships the full `motion` component by accident.
 */
import { type ReactNode } from "react";
import { LazyMotion, domAnimation } from "motion/react";

export { m, AnimatePresence } from "motion/react";

/** UIKit sheet curve — matches Tailwind's `ease-ios`. */
export const EASE_IOS = [0.32, 0.72, 0, 1] as const;

/** Smooth structural moves (steps sliding, cards settling). */
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;
/** Punchy accents (badges, checkmarks, CTA presses). */
export const SPRING_POP = { type: "spring", stiffness: 420, damping: 26 } as const;

export const AppMotionProvider = ({ children }: { children: ReactNode }) => (
  <LazyMotion features={domAnimation} strict>
    {children}
  </LazyMotion>
);
