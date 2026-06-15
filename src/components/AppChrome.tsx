import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { captureScreen, identifyUser, resetAnalyticsUser } from "@/services/analytics";
import { syncPushUser } from "@/services/pushService";

/** Routes that should never show the app tab bar (pre-auth screens). */
const NAV_HIDDEN_ROUTES = ["/auth", "/auth/callback"];

/**
 * Global app chrome rendered once inside the router:
 * - scrolls the window back to top on every route change (native screens
 *   always open at the top; scroll containers inside pages reset on mount)
 * - records a screen view for analytics on each route change
 * - maps the signed-in user to analytics + push on login/logout
 * - renders the bottom tab bar on every screen for signed-in users, so
 *   secondary pages (FAQ, legal, contact) keep the tray instead of
 *   stranding the user without navigation.
 */
export const AppChrome = () => {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
    captureScreen(pathname);
  }, [pathname]);

  // Keep analytics identity + push registration in sync with the session.
  useEffect(() => {
    if (loading) return;
    if (user) {
      identifyUser(user.id, user.email ? { email: user.email } : undefined);
      void syncPushUser(user.id);
    } else {
      resetAnalyticsUser();
      void syncPushUser(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  const hideNav = loading || !user || NAV_HIDDEN_ROUTES.includes(pathname);
  if (hideNav) return null;

  return <MobileBottomNav />;
};
