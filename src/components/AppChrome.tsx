import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { MobileBottomNav } from "@/components/MobileBottomNav";

/** Routes that should never show the app tab bar (pre-auth screens). */
const NAV_HIDDEN_ROUTES = ["/auth", "/auth/callback"];

/**
 * Global app chrome rendered once inside the router:
 * - scrolls the window back to top on every route change (native screens
 *   always open at the top; scroll containers inside pages reset on mount)
 * - renders the bottom tab bar on every screen for signed-in users, so
 *   secondary pages (FAQ, legal, contact) keep the tray instead of
 *   stranding the user without navigation.
 */
export const AppChrome = () => {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const hideNav = loading || !user || NAV_HIDDEN_ROUTES.includes(pathname);
  if (hideNav) return null;

  return <MobileBottomNav />;
};
