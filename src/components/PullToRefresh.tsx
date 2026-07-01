import { useEffect, useRef, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHapticFeedback } from "@/lib/capacitor";

const THRESHOLD = 72; // px of pull that arms a refresh
const MAX_PULL = 110; // rubber-band ceiling
const HOLD = 52; // indicator resting offset while refreshing

/**
 * Native-feeling pull-to-refresh for the app's inner scroll containers
 * (browser pull-to-refresh is disabled globally via overscroll-behavior).
 *
 * The content tracks the finger with rubber-band resistance; past the
 * threshold the arrow flips, releases fire a medium haptic, and the
 * indicator holds while `onRefresh` settles. Touch-only by construction —
 * desktop trackpads/mice never see it.
 */
export const PullToRefresh = ({
  onRefresh,
  className,
  children,
}: {
  onRefresh: () => Promise<unknown> | unknown;
  className?: string;
  children: ReactNode;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let startY = 0;
    let pulling = false;
    let armedHaptic = false;
    let dist = 0;

    const reset = () => {
      pulling = false;
      dist = 0;
      setDragging(false);
      setPull(0);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      pulling = el.scrollTop <= 0;
      armedHaptic = false;
      startY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || el.scrollTop > 0) {
        if (dist !== 0) reset();
        return;
      }
      // We own this gesture now: stop the scroll container from consuming it.
      e.preventDefault();
      dist = Math.min(MAX_PULL, Math.pow(dy, 0.86));
      if (dist >= THRESHOLD && !armedHaptic) {
        armedHaptic = true;
        triggerHapticFeedback("light");
      }
      setDragging(true);
      setPull(dist);
    };

    const onTouchEnd = () => {
      if (!pulling) return;
      pulling = false;
      setDragging(false);
      if (dist >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPull(HOLD);
        triggerHapticFeedback("medium");
        Promise.resolve(onRefreshRef.current()).finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          setPull(0);
        });
      } else {
        setPull(0);
      }
      dist = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const armed = pull >= THRESHOLD;
  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      {/* Floating iOS-style refresh disc */}
      <div
        aria-hidden={!refreshing}
        role="status"
        aria-label={refreshing ? "Refreshing" : undefined}
        className="pointer-events-none absolute left-1/2 top-0 z-20"
        style={{
          transform: `translate(-50%, ${pull - 44}px)`,
          opacity: refreshing ? 1 : progress,
          transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease",
        }}
      >
        <span className="glass-strong flex h-9 w-9 items-center justify-center rounded-full shadow-lg">
          <RefreshCw
            className={cn(
              "h-4 w-4",
              armed || refreshing ? "text-primary" : "text-muted-foreground",
              refreshing && "animate-spin",
            )}
            style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
          />
        </span>
      </div>

      {/* The one scrolling element (Despia pattern) — follows the finger */}
      <div
        ref={scrollRef}
        className="despia-scroll"
        style={{
          transform: pull > 0 ? `translateY(${pull}px)` : undefined,
          transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
};
