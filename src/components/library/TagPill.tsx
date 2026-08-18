import { useRef } from "react";
import { cn } from "@/lib/utils";
import { tagPillStyle } from "@/lib/folderTagRules";

const LONG_PRESS_MS = 480;
const MOVE_CANCEL_PX = 10;

interface TagPillProps {
  name: string;
  selected?: boolean;
  onSelect: () => void;
  onSmartFolder: (tagName: string) => void;
  className?: string;
}

/**
 * Library tag chip: tap filters the playbook; long-press / right-click offers
 * a Boardroom smart folder for that tag.
 */
export function TagPill({ name, selected = false, onSelect, onSmartFolder, className }: TagPillProps) {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const didLongPress = useRef(false);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startPress = (x: number, y: number) => {
    didLongPress.current = false;
    startRef.current = { x, y };
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      didLongPress.current = true;
      onSmartFolder(name);
    }, LONG_PRESS_MS);
  };

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      style={tagPillStyle(name, selected)}
      onClick={(event) => {
        event.stopPropagation();
        if (didLongPress.current) return;
        onSelect();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSmartFolder(name);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (event.pointerType === "mouse" && event.button !== 0) return;
        startPress(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        const start = startRef.current;
        if (!start) return;
        if (
          Math.abs(event.clientX - start.x) > MOVE_CANCEL_PX ||
          Math.abs(event.clientY - start.y) > MOVE_CANCEL_PX
        ) {
          clearTimer();
        }
      }}
      onPointerUp={clearTimer}
      onPointerCancel={clearTimer}
      onPointerLeave={clearTimer}
    >
      {name}
    </button>
  );
}
