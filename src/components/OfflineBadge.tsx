import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { WifiOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const AUTH_AND_MARKETING_ROUTES = new Set([
  "/auth",
  "/auth/callback",
  "/privacy-policy",
  "/terms-of-service",
  "/cookies",
  "/faq",
  "/account-deletion",
  "/contact",
]);

/** Routes where saved bookmarks / last analysis offline cache is supported. */
const OFFLINE_APP_ROUTES = new Set(["/", "/account", "/settings", "/founders", "/discover", "/favorites"]);

async function verifyConnectivity(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine) return true;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    await fetch(`${window.location.origin}/favicon.ico`, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

function shouldShowOnRoute(pathname: string, isAuthenticated: boolean): boolean {
  if (AUTH_AND_MARKETING_ROUTES.has(pathname)) return false;
  if (!OFFLINE_APP_ROUTES.has(pathname)) return false;
  // Marketing homepage at / when logged out has no offline cache to surface.
  if (pathname === "/" && !isAuthenticated) return false;
  return true;
}

/**
 * Slim banner when the device is offline on app routes with cached content
 * (Saved tab + last viewed analysis — required for App Review §4.2).
 * Suppressed on auth, marketing, and legal routes where offline cache is irrelevant.
 */
export const OfflineBadge = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!shouldShowOnRoute(pathname, Boolean(user))) {
      setOffline(false);
      return;
    }

    let cancelled = false;

    const check = async () => {
      const online = await verifyConnectivity();
      if (!cancelled) setOffline(!online);
    };

    void check();

    const onOnline = () => {
      void check();
    };
    const onOffline = () => {
      setOffline(true);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [pathname, user]);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="glass-strong fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full text-muted-foreground text-xs font-medium px-3.5 py-1.5 shadow-md animate-slide-up"
      style={{ top: "calc(var(--safe-area-top) + 0.5rem)" }}
    >
      <WifiOff className="h-3.5 w-3.5" />
      Offline — showing saved content
    </div>
  );
};
