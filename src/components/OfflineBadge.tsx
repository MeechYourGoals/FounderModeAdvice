import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Slim banner that appears whenever the device loses network connectivity.
 * Lets users know cached content is still available — keeps the Saved/last
 * analysis screens useful offline (required for App Review §4.2).
 */
export const OfflineBadge = () => {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-muted text-muted-foreground text-xs font-medium px-3 py-1.5 shadow-sm border border-border"
      style={{ top: "calc(var(--safe-area-top) + 0.5rem)" }}
    >
      <WifiOff className="h-3.5 w-3.5" />
      Offline — showing saved content
    </div>
  );
};
