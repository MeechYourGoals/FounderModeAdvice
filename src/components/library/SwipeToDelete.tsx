import { useRef, useState, type ReactNode, type PointerEvent } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const REVEAL = 76;
const COMMIT = 108;

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: ReactNode;
}

/**
 * Horizontal swipe-to-delete for mobile cards. Vertical movement is ignored so
 * it does not fight the page scroll or pull-to-refresh.
 */
export function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps) {
  const [offset, setOffset] = useState(0);
  const startRef = useRef<{ x: number; y: number; locked: "h" | "v" | null } | null>(null);
  const offsetRef = useRef(0);
  offsetRef.current = offset;

  const reset = () => setOffset(0);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    startRef.current = { x: event.clientX, y: event.clientY, locked: null };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      start.locked = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (start.locked !== "h") return;
    event.preventDefault();
    setOffset(Math.max(-REVEAL - 24, Math.min(0, dx)));
  };

  const onPointerUp = () => {
    const start = startRef.current;
    startRef.current = null;
    if (!start || start.locked !== "h") {
      reset();
      return;
    }
    if (offsetRef.current <= -COMMIT) {
      reset();
      onDelete();
      return;
    }
    setOffset(offsetRef.current <= -REVEAL / 2 ? -REVEAL : 0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className="absolute inset-y-0 right-0 flex w-[76px] items-center justify-center bg-destructive text-destructive-foreground"
        aria-hidden
      >
        <button
          type="button"
          className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium"
          onClick={(event) => {
            event.stopPropagation();
            reset();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
      <div
        className={cn("relative bg-transparent touch-pan-y", offset === 0 && "transition-transform duration-200")}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={offset !== 0 ? (event) => {
          event.stopPropagation();
          reset();
        } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
