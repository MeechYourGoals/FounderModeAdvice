import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { THEME_DEFAULT, THEME_ENABLE_SYSTEM } from "@/lib/theme";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ActiveProfileProvider } from "@/contexts/ActiveProfileContext";
import { useToast } from "@/hooks/use-toast";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Account from "./pages/Account";
import Settings from "./pages/Settings";
import Founders from "./pages/Founders";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import FAQ from "./pages/FAQ";
import AccountDeletion from "./pages/AccountDeletion";
import Contact from "./pages/Contact";
import AcceptInvite from "./pages/AcceptInvite";
import SharedWithMe from "./pages/SharedWithMe";
import SharedFolder from "./pages/SharedFolder";
import AcceptAnalysisInvite from "./pages/AcceptAnalysisInvite";
import SharedAnalysis from "./pages/SharedAnalysis";
import Favorites from "./pages/Favorites";
import NotFound from "./pages/NotFound";
// Discover ships as its own chunk: it is a signed-in premium surface, so the
// landing/auth path should never download it.
const Discover = lazy(() => import("./pages/Discover"));
const ShareInsight = lazy(() => import("./pages/ShareInsight"));
const ScenariosHub = lazy(() => import("./pages/ScenariosHub"));
const ScenarioPage = lazy(() => import("./pages/ScenarioPage"));
const BlogIndex = lazy(() => import("./pages/BlogIndex"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const ScreenshotStudio = lazy(() => import("./pages/ScreenshotStudio"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
import { OfflineBadge } from "@/components/OfflineBadge";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { AppChrome } from "@/components/AppChrome";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { AUTH_ALIASES, HOME_HASH_ALIASES } from "@/lib/homeAliases";

const queryClient = new QueryClient();

// Lazy-route fallback: a centered spinner instead of a blank flash while the
// chunk downloads (matters most on mobile connections).
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

// Component to handle subscription callback messages
function SubscriptionCallback() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const subscriptionStatus = searchParams.get("subscription");
    if (subscriptionStatus === "success") {
      toast({
        title: "Subscription activated!",
        description: "Your subscription is now active. Enjoy your upgraded features!",
      });
      searchParams.delete("subscription");
      setSearchParams(searchParams);
    } else if (subscriptionStatus === "cancelled") {
      toast({
        title: "Subscription cancelled",
        description: "No changes were made to your account.",
      });
      searchParams.delete("subscription");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, toast]);

  return null;
}

// Replays an iOS-style push animation whenever the route changes. The key
// remounts the wrapper per pathname; .route-screen (index.css) only animates
// below the desktop breakpoint and respects prefers-reduced-motion.
// data-vaul-drawer-wrapper lets bottom sheets scale this screen back behind
// them, exactly like a native iOS page sheet.
function ScreenTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="route-screen bg-background" data-vaul-drawer-wrapper="">
      {children}
    </div>
  );
}

const App = () => (
  <AppErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme={THEME_DEFAULT} enableSystem={THEME_ENABLE_SYSTEM}>
      <AuthProvider>
      <SubscriptionProvider>
        <ActiveProfileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PaymentTestModeBanner />
            <SubscriptionCallback />
            <OfflineBadge />

            <AppChrome />
            <ScreenTransition>
            <Routes>
              <Route path="/" element={<Index />} />
              {AUTH_ALIASES.map((path) => (
                <Route key={path} path={path} element={<Navigate to="/auth" replace />} />
              ))}
              {Object.entries(HOME_HASH_ALIASES).map(([path, to]) => (
                <Route key={path} path={path} element={<Navigate to={to} replace />} />
              ))}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/account" element={<Account />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/founders" element={<Founders />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/account-deletion" element={<AccountDeletion />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/invite/:token" element={<AcceptInvite />} />
              <Route path="/analysis-invite/:token" element={<AcceptAnalysisInvite />} />
              <Route path="/shared" element={<SharedWithMe />} />
              <Route path="/shared/:folderId" element={<SharedFolder />} />
              <Route path="/shared-analysis/:episodeId" element={<SharedAnalysis />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route
                path="/i/:slug"
                element={<Suspense fallback={<RouteFallback />}><ShareInsight /></Suspense>}
              />
              <Route
                path="/discover"
                element={<Suspense fallback={<RouteFallback />}><Discover /></Suspense>}
              />
              <Route
                path="/scenarios"
                element={<Suspense fallback={<RouteFallback />}><ScenariosHub /></Suspense>}
              />
              <Route
                path="/scenarios/:slug"
                element={<Suspense fallback={<RouteFallback />}><ScenarioPage /></Suspense>}
              />
              <Route
                path="/blog"
                element={<Suspense fallback={<RouteFallback />}><BlogIndex /></Suspense>}
              />
              <Route
                path="/blog/:slug"
                element={<Suspense fallback={<RouteFallback />}><BlogPost /></Suspense>}
              />
              <Route
                path="/__screenshots/:frame"
                element={<Suspense fallback={<RouteFallback />}><ScreenshotStudio /></Suspense>}
              />
              <Route
                path="/.lovable/oauth/consent"
                element={<Suspense fallback={<RouteFallback />}><OAuthConsent /></Suspense>}
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ScreenTransition>
          </BrowserRouter>
        </TooltipProvider>
        </ActiveProfileProvider>
      </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
