import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { AnalysisForm } from "@/components/AnalysisForm";
import { EpisodesTable } from "@/components/EpisodesTable";
import { EpisodeDetail } from "@/components/EpisodeDetail";
import { TodayDesk } from "@/components/today/TodayDesk";
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { requestLibraryRefresh } from "@/lib/libraryRefresh";
import { shouldShowAppAuthFirst } from "@/lib/appMode";
import { homePanelFromLocationState, type HomePanel } from "@/lib/mobileNav";
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
  // Match the bottom tab bar (`lg:hidden`) so Profiles/Saved are a page sheet
  // wherever the tray is visible; desktop keeps the right-hand sheet.
  const isNavViewport = useMediaQuery("(max-width: 1023px)");
  const analyzeRef = useRef<HTMLDivElement>(null);

  const scrollToAnalyze = () => {
    analyzeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openPanel = (tab: HomePanel) => {
    setActiveTab(tab);
    setProfileOpen(true);
  };

  const publishPanel = (panel: HomePanel | null) => {
    const current = homePanelFromLocationState(location.state);
    if (current === panel) return;
    navigate(".", { replace: true, state: panel ? { panel, ts: Date.now() } : null });
  };

  const openPanelAndPublish = (tab: HomePanel) => {
    openPanel(tab);
    publishPanel(tab);
  };

  const setSheetOpen = (open: boolean) => {
    setProfileOpen(open);
    if (!open) publishPanel(null);
  };

  // Respond to the bottom-nav tray (router state) — open a panel or jump to Analyze.
  // Keep `panel` on location.state while the sheet is open so the tab bar
  // can highlight Profiles/Saved; only clear it when dismissing or taking
  // a different home action.
  useEffect(() => {
    const state = location.state as {
      panel?: string;
      action?: string;
      url?: string;
      recommendationId?: string | null;
      episodeId?: string;
    } | null;
    if (!state) return;
    const panel = homePanelFromLocationState(state);
    if (panel) {
      openPanel(panel);
    } else if (state.action === "openEpisode" && state.episodeId) {
      setProfileOpen(false);
      setSelectedEpisodeId(state.episodeId);
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
    } else {
      return;
    }
    if (!panel) {
      // Clear one-shot actions so the same tap can re-trigger later.
      // Leave `panel` in place so the bottom nav stays highlighted.
      navigate(".", { replace: true, state: null });
    }
  }, [location.state, navigate]);

  // Respond to same-page triggers (ProfileSwitcher "manage", empty-state CTAs).
  useEffect(() => {
    const openProfiles = () => openPanelAndPublish("profiles");
    const openBookmarks = () => openPanelAndPublish("bookmarks");
    const openAnalyze = () => { setSelectedEpisodeId(null); requestAnimationFrame(scrollToAnalyze); };
    // Fired when an analysis for a submitted URL already exists — we surface
    // the existing memo instead of recomputing it.
    const openEpisode = (e: Event) => {
      const id = (e as CustomEvent<{ episodeId?: string }>).detail?.episodeId;
      if (!id) return;
      setProfileOpen(false);
      navigate(".", { replace: true, state: null });
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
      <Suspense fallback={<div className="h-dvh bg-background" />}>
        <PublicLanding />
      </Suspense>
    );
  }

  if (loading) {
    return <AppLoadingScreen label="Getting your desk ready..." />;
  }

  const handleToggle = (tab: HomePanel) => {
    triggerHapticFeedback('light');
    if (profileOpen && activeTab === tab) {
      setSheetOpen(false);
    } else {
      openPanelAndPublish(tab);
    }
  };

  return (
    <div className="app-ambient h-dvh flex flex-col bg-gradient-to-b from-background to-muted/20">
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


      {/* Profiles / Bookmarks: bottom page sheet on nav viewports (vaul,
          grabber, scales the screen behind), right-hand sheet on desktop. */}
      {isNavViewport ? (
        <Drawer open={profileOpen} onOpenChange={setSheetOpen} shouldScaleBackground>
          <DrawerContent className="h-[92dvh] mt-0 rounded-t-3xl flex flex-col px-4 pb-[calc(1rem+var(--safe-area-bottom))]">
            <DrawerHeader className="px-0 pt-1 text-left">
              <DrawerTitle>{activeTab === "bookmarks" ? "Bookmarks" : "Business Profiles"}</DrawerTitle>
              <DrawerDescription>
                {activeTab === "bookmarks"
                  ? "Organize saved episodes into folders"
                  : "Manage your business profiles"}
              </DrawerDescription>
            </DrawerHeader>
            <ScrollArea className="flex-1 min-h-0 pr-2">
              {profileOpen && (
                <ProfileSettings
                  view={activeTab}
                  onSelectEpisode={(id) => {
                    setSelectedEpisodeId(id);
                    setSheetOpen(false);
                  }}
                  onCloseRequest={() => setSheetOpen(false)}
                />
              )}
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={profileOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" hideClose className="w-full max-w-[100vw] sm:w-[400px] safe-top safe-bottom">
            <div className="flex items-center justify-between gap-2 -ml-2 mb-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-11 px-2 text-base"
                onClick={() => { triggerHapticFeedback('light'); setSheetOpen(false); }}
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
            <ScrollArea className="h-[calc(100dvh-180px-var(--safe-area-top)-var(--safe-area-bottom))] pr-4 mt-4">
              {profileOpen && (
                <ProfileSettings
                  view={activeTab}
                  onSelectEpisode={(id) => {
                    setSelectedEpisodeId(id);
                    setSheetOpen(false);
                  }}
                  onCloseRequest={() => setSheetOpen(false)}
                />
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {/* Scrollable content area (Despia pattern: only this element scrolls),
          wrapped in native pull-to-refresh that re-syncs the library. */}
      <PullToRefresh
        onRefresh={async () => {
          await requestLibraryRefresh();
          window.dispatchEvent(new Event("profilesChanged"));
        }}
      >
        <div className="container mx-auto px-4 py-8 sm:py-12 space-y-8 sm:space-y-12 max-w-6xl pb-24 md:pb-8" style={{ paddingBottom: isMobile ? 'calc(5rem + var(--safe-area-bottom))' : undefined }}>
          {!selectedEpisodeId && (
            <TodayDesk
              onOpenEpisode={setSelectedEpisodeId}
              onPrepareMemo={(url, recommendationId) => {
                setSelectedEpisodeId(null);
                requestAnimationFrame(() => {
                  scrollToAnalyze();
                  window.dispatchEvent(
                    new CustomEvent("analyzeUrl", { detail: { url, recommendationId } }),
                  );
                });
              }}
            />
          )}
          <div ref={analyzeRef} className="scroll-mt-20">
            <AnalysisForm variant="composer" inactive={Boolean(selectedEpisodeId)} />
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
