import { useRef, type ReactNode } from "react";
import { m, useMotionValue, useSpring } from "@/components/marketing/motion";

/**
 * Pointer-tracking tilt (±4°) with a sprung return. Only reacts on
 * fine-pointer devices — touch scrolling never triggers it.
 */
export const TiltCard = ({ children, className }: { children: ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 220, damping: 18 });
  const springY = useSpring(rotateY, { stiffness: 220, damping: 18 });

  const handleMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 8);
    rotateX.set(py * -8);
  };

  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <m.div
      ref={ref}
      className={className}
      style={{ rotateX: springX, rotateY: springY, transformPerspective: 900 }}
      onPointerMove={handleMove}
      onPointerLeave={reset}
    >
      {children}
    </m.div>
  );
};
