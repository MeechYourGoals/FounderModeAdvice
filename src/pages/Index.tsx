import { useState, useEffect, useRef } from "react";
import { HeroSection } from "@/components/HeroSection";
import { AnalysisForm } from "@/components/AnalysisForm";
import { EpisodesTable } from "@/components/EpisodesTable";
import { EpisodeDetail } from "@/components/EpisodeDetail";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileSettings } from "@/components/ProfileSettings";
import { BrandLogo } from "@/components/BrandLogo";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { PullToRefresh } from "@/components/PullToRefresh";

import { PublicLanding } from "@/components/PublicLanding";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Bookmark, LogOut, Briefcase, Menu, User, Settings, Users, Star, ChevronLeft } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Card } from "@/components/ui/card";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { shouldShowAppAuthFirst } from "@/lib/appMode";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";

const Index = () => {
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"profiles" | "bookmarks" | "subscription">("profiles");
  const [desktopPanel, setDesktopPanel] = useState<null | "profiles" | "bookmarks">(null);

  const { user, loading, signOut } = useAuth();
  const { subscription } = useSubscription();
  const { loading: onboardingLoading, completed: onboardingCompleted, complete: completeOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
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
    const state = location.state as { panel?: string; action?: string } | null;
    if (!state) return;
    if (state.panel === "profiles" || state.panel === "bookmarks") {
      openPanel(state.panel);
    } else if (state.action === "analyze") {
      setProfileOpen(false);
      setSelectedEpisodeId(null);
      requestAnimationFrame(scrollToAnalyze);
    }
    // Clear the state so the same tap can re-trigger later.
    navigate(".", { replace: true, state: null });
  }, [location.state, navigate]);

  // Respond to same-page triggers (ProfileSwitcher "manage", empty-state CTAs).
  useEffect(() => {
    const openProfiles = () => openPanel("profiles");
    const openBookmarks = () => openPanel("bookmarks");
    const openAnalyze = () => { setSelectedEpisodeId(null); requestAnimationFrame(scrollToAnalyze); };
    window.addEventListener("openProfiles", openProfiles);
    window.addEventListener("openBookmarks", openBookmarks);
    window.addEventListener("openAnalyze", openAnalyze);
    return () => {
      window.removeEventListener("openProfiles", openProfiles);
      window.removeEventListener("openBookmarks", openBookmarks);
      window.removeEventListener("openAnalyze", openAnalyze);
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
    return shouldShowAppAuthFirst() ? <Navigate to="/auth" replace /> : <PublicLanding />;
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
      {/* First-run product tour — shows once per user until manually restarted */}
      {user && !onboardingLoading && onboardingCompleted === false && (
        <OnboardingDialog open onClose={completeOnboarding} />
      )}

      {/* Mobile & Tablet nav - relative top bar with safe area (Despia pattern) */}
      {!isDesktop ? (
        <div className="glass-nav hairline-b relative z-50" style={{ paddingTop: 'var(--safe-area-top)' }}>
          <div className="flex items-center justify-between px-4 py-2">
            <button onClick={() => { triggerHapticFeedback('light'); setSelectedEpisodeId(null); window.dispatchEvent(new Event("homeReset")); }} className="flex items-center hover:opacity-80 transition-opacity shrink-0" aria-label="Founder Mode Advice — home">
              <BrandLogo className="h-8 w-auto" />
            </button>

            <div className="flex items-center gap-1">
              <ProfileSwitcher compact />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => { triggerHapticFeedback('light'); handleToggle("profiles"); }}>
                    <Briefcase className="h-4 w-4 mr-2" />
                    Business Profiles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { triggerHapticFeedback('light'); handleToggle("bookmarks"); }}>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Bookmarks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { triggerHapticFeedback('light'); setProfileOpen(false); navigate("/favorites"); }}>
                    <Star className="h-4 w-4 mr-2" />
                    Favorites
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { triggerHapticFeedback('light'); setProfileOpen(false); navigate("/shared"); }}>
                    <Users className="h-4 w-4 mr-2" />
                    Shared with me
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { triggerHapticFeedback('light'); setProfileOpen(false); navigate("/account"); }}>
                    <User className="h-4 w-4 mr-2" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { triggerHapticFeedback('light'); setProfileOpen(false); navigate("/settings"); }}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { triggerHapticFeedback('light'); signOut(); }}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ) : (
        <>
        {/* Desktop brand - fixed top-left */}
        <button
          onClick={() => { setSelectedEpisodeId(null); window.dispatchEvent(new Event("homeReset")); }}
          className="fixed top-4 left-4 z-50 flex items-center hover:opacity-80 transition-opacity"
          aria-label="Founder Mode Advice — home"
        >
          <BrandLogo className="h-10 w-auto" />
        </button>
        {/* Desktop nav */}
        <div className="fixed top-4 right-4 z-50 flex gap-2 items-center">
          <ProfileSwitcher />

          <Popover
            open={desktopPanel === "profiles"}
            onOpenChange={(open) => setDesktopPanel(open ? "profiles" : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant={desktopPanel === "profiles" ? "default" : "outline"}
                size="sm"
                onClick={() => triggerHapticFeedback('light')}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Business Profiles
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(420px,calc(100vw-2rem))] mr-4 p-0" align="end" sideOffset={8}>
              <div className="max-h-[calc(100vh-100px)] overflow-hidden p-4">
                <ScrollArea className="h-full max-h-[calc(100vh-140px)]">
                  <ProfileSettings
                    key="profiles"
                    view="profiles"
                    onSelectEpisode={setSelectedEpisodeId}
                    onCloseRequest={() => setDesktopPanel(null)}
                    condensed={true}
                  />
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          <Popover
            open={desktopPanel === "bookmarks"}
            onOpenChange={(open) => setDesktopPanel(open ? "bookmarks" : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant={desktopPanel === "bookmarks" ? "default" : "outline"}
                size="sm"
                onClick={() => triggerHapticFeedback('light')}
              >
                <Bookmark className="h-4 w-4 mr-2" />
                Bookmarks
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(420px,calc(100vw-2rem))] mr-4 p-0" align="end" sideOffset={8}>
               <div className="max-h-[calc(100vh-100px)] overflow-hidden p-4">
                <ScrollArea className="h-full max-h-[calc(100vh-140px)]">
                  <ProfileSettings
                    key="bookmarks"
                    view="bookmarks"
                    onSelectEpisode={setSelectedEpisodeId}
                    onCloseRequest={() => setDesktopPanel(null)}
                    condensed={true}
                  />
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={() => navigate("/favorites")}>
            <Star className="h-4 w-4 mr-2" />
            Favorites
          </Button>

          <Button variant="outline" size="sm" onClick={() => navigate("/shared")}>
            <Users className="h-4 w-4 mr-2" />
            Shared
          </Button>

          <Button variant="outline" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>

          <Button variant="outline" size="sm" onClick={() => navigate("/settings")} aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Button>

          <ThemeToggle />
        </div>
        </>
      )}


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
