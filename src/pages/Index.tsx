import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { HeroSection } from "@/components/HeroSection";
import { AnalysisForm } from "@/components/AnalysisForm";
import { EpisodesTable } from "@/components/EpisodesTable";
import { EpisodeDetail } from "@/components/EpisodeDetail";
import { ProfileSettings } from "@/components/ProfileSettings";
import { AppHeader } from "@/components/AppHeader";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { PullToRefresh } from "@/components/PullToRefresh";

// Lazy boundary: the marketing landing (and its motion animation library)
// ships as its own async chunk so the authed app shell stays lean.
const PublicLanding = lazy(() =>
  import("@/components/PublicLanding").then((mod) => ({ default: mod.PublicLanding })),
);
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft } from "lucide-react";
import { PENDING_INVITE_KEY } from "@/services/folderSharing";
import { PENDING_ANALYSIS_INVITE_KEY } from "@/services/analysisSharing";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { shouldShowAppAuthFirst } from "@/lib/appMode";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { WalkthroughDialog } from "@/components/onboarding/WalkthroughDialog";
import { useOnboarding } from "@/hooks/useOnboarding";

const Index = () => {
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"profiles" | "bookmarks" | "subscription">("profiles");
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);

  const { user, loading } = useAuth();
  const { loading: onboardingLoading, completed: onboardingCompleted, complete: completeOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const analyzeRef = useRef<HTMLDivElement>(null);

  const scrollToAnalyze = () => {
    analyzeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openPanel = (tab: "profiles" | "bookmarks") => {
    setActiveTab(tab);
    setProfileOpen(true);
  };

  // Respond to the bottom-nav tray (router state) — open a panel or jump to Analyze.
  useEffect(() => {
    const state = location.state as {
      panel?: string;
      action?: string;
      url?: string;
      recommendationId?: string | null;
    } | null;
    if (!state) return;
    if (state.panel === "profiles" || state.panel === "bookmarks") {
      openPanel(state.panel);
    } else if (state.action === "analyze") {
      setProfileOpen(false);
      setSelectedEpisodeId(null);
      requestAnimationFrame(scrollToAnalyze);
    } else if (state.action === "analyzeUrl" && state.url) {
      // Discover hands off here: the URL goes through the exact same
      // "analyzeUrl" path a starter video uses, so the analysis pipeline,
      // limits, consent, and history are unchanged.
      setProfileOpen(false);
      setSelectedEpisodeId(null);
      const { url, recommendationId } = state;
      requestAnimationFrame(() => {
        scrollToAnalyze();
        window.dispatchEvent(
          new CustomEvent("analyzeUrl", { detail: { url, recommendationId } }),
        );
      });
    } else if (state.action === "walkthrough") {
      // Settings/Account "Replay app walkthrough" lands here.
      setProfileOpen(false);
      setWalkthroughOpen(true);
    }
    // Clear the state so the same tap can re-trigger later.
    navigate(".", { replace: true, state: null });
  }, [location.state, navigate]);

  // Respond to same-page triggers (ProfileSwitcher "manage", empty-state CTAs).
  useEffect(() => {
    const openProfiles = () => openPanel("profiles");
    const openBookmarks = () => openPanel("bookmarks");
    const openAnalyze = () => { setSelectedEpisodeId(null); requestAnimationFrame(scrollToAnalyze); };
    // Fired when an analysis for a submitted URL already exists — we surface
    // the existing memo instead of recomputing it.
    const openEpisode = (e: Event) => {
      const id = (e as CustomEvent<{ episodeId?: string }>).detail?.episodeId;
      if (!id) return;
      setProfileOpen(false);
      setSelectedEpisodeId(id);
    };
    window.addEventListener("openProfiles", openProfiles);
    window.addEventListener("openBookmarks", openBookmarks);
    window.addEventListener("openAnalyze", openAnalyze);
    window.addEventListener("openEpisode", openEpisode as EventListener);
    return () => {
      window.removeEventListener("openProfiles", openProfiles);
      window.removeEventListener("openBookmarks", openBookmarks);
      window.removeEventListener("openAnalyze", openAnalyze);
      window.removeEventListener("openEpisode", openEpisode as EventListener);
    };
  }, []);

  // Finish accepting a folder invite if the user arrived via a link before signing in.
  useEffect(() => {
    if (loading || !user) return;
    const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
    if (pendingInvite) {
      navigate(`/invite/${pendingInvite}`, { replace: true });
    }
    const pendingAnalysisInvite = localStorage.getItem(PENDING_ANALYSIS_INVITE_KEY);
    if (pendingAnalysisInvite) {
      navigate(`/analysis-invite/${pendingAnalysisInvite}`, { replace: true });
    }
  }, [user, loading, navigate]);

  // Unauthenticated: installed app/PWA/native users go straight to the auth screen,
  // while regular browser visitors still see the marketing homepage.
  if (!loading && !user) {
    return shouldShowAppAuthFirst() ? (
      <Navigate to="/auth" replace />
    ) : (
      <Suspense fallback={<div className="h-screen bg-background" />}>
        <PublicLanding />
      </Suspense>
    );
  }

  if (loading) {
    return <AppLoadingScreen label="Preparing your library..." />;
  }

  const handleToggle = (tab: "profiles" | "bookmarks") => {
    triggerHapticFeedback('light');
    if (profileOpen && activeTab === tab) {
      setProfileOpen(false);
    } else {
      setActiveTab(tab);
      setProfileOpen(true);
    }
  };

  return (
    <div className="app-ambient h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* First-run setup intake — shows once per user until restarted from Settings */}
      {user && !onboardingLoading && onboardingCompleted === false && (
        <OnboardingFlow
          open
          onComplete={(showWalkthrough) => {
            completeOnboarding();
            if (showWalkthrough) setWalkthroughOpen(true);
          }}
        />
      )}

      {/* Feature tour — chained from setup or replayed via Settings/Account */}
      <WalkthroughDialog open={walkthroughOpen} onOpenChange={setWalkthroughOpen} />

      <AppHeader
        variant="home"
        onHomeClick={() => {
          setSelectedEpisodeId(null);
          window.dispatchEvent(new Event("homeReset"));
        }}
        onOpenPanel={(panel) => handleToggle(panel)}
      />

      {/* Spacer for the fixed desktop header bar */}
      <div className="hidden lg:block h-14 shrink-0" aria-hidden />


      {/* Slide-over panel for Profiles/Bookmarks (used by the bottom-nav tray,
          profile switcher, and empty-state CTAs across all viewports). */}
      {(
        <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
          <SheetContent side="right" hideClose className="w-full max-w-[100vw] sm:w-[400px] safe-top safe-bottom">
            <div className="flex items-center justify-between gap-2 -ml-2 mb-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-11 px-2 text-base"
                onClick={() => { triggerHapticFeedback('light'); setProfileOpen(false); }}
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back
              </Button>
            </div>
            <SheetHeader>
              <SheetTitle>{activeTab === "bookmarks" ? "Bookmarks" : "Business Profiles"}</SheetTitle>
              <SheetDescription>
                {activeTab === "bookmarks"
                  ? "Organize saved episodes into folders"
                  : "Manage your business profiles"}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-180px-var(--safe-area-top)-var(--safe-area-bottom))] pr-4 mt-4">
              {profileOpen && (
                <ProfileSettings
                  view={activeTab}
                  onSelectEpisode={(id) => {
                    setSelectedEpisodeId(id);
                    setProfileOpen(false);
                  }}
                  onCloseRequest={() => setProfileOpen(false)}
                />
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {/* Scrollable content area (Despia pattern: only this element scrolls),
          wrapped in native pull-to-refresh that re-syncs the library. */}
      <PullToRefresh
        onRefresh={() => {
          window.dispatchEvent(new Event("libraryRefresh"));
          window.dispatchEvent(new Event("profilesChanged"));
          // Library refetch isn't awaitable from here; hold the indicator
          // long enough to feel real without ever feeling stuck.
          return new Promise((resolve) => setTimeout(resolve, 900));
        }}
      >
        <HeroSection />
        <div className="container mx-auto px-4 py-8 sm:py-12 space-y-8 sm:space-y-12 max-w-6xl pb-24 md:pb-8" style={{ paddingBottom: isMobile ? 'calc(5rem + var(--safe-area-bottom))' : undefined }}>
          <div ref={analyzeRef} className="scroll-mt-20">
            <AnalysisForm />
          </div>
          {selectedEpisodeId ? (
            <EpisodeDetail
              episodeId={selectedEpisodeId}
              onBack={() => setSelectedEpisodeId(null)}
            />
          ) : (
            <EpisodesTable onSelectEpisode={setSelectedEpisodeId} />
          )}
        </div>
      </PullToRefresh>
    </div>
  );
};

export default Index;
