import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
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
import { OfflineBadge } from "@/components/OfflineBadge";
import { AppChrome } from "@/components/AppChrome";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

const queryClient = new QueryClient();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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

            <Routes>
              <Route path="/" element={<Index />} />
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AppChrome />
            <PWAInstallPrompt />
          </BrowserRouter>
        </TooltipProvider>
        </ActiveProfileProvider>
      </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
