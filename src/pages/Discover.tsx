import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Building2, Check, ChevronDown, Compass, Globe, RefreshCw } from "lucide-react";

import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { PullToRefresh } from "@/components/PullToRefresh";
import { SecondaryPageHeader } from "@/components/SecondaryPageHeader";
import { UpgradePrompt } from "@/components/subscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscoverEmptyState } from "@/components/discover/DiscoverEmptyState";
import { DiscoveryCard } from "@/components/discover/DiscoveryCard";
import { DiscoveryGridSkeleton } from "@/components/discover/DiscoveryCardSkeleton";

import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useInspirationLibrary } from "@/hooks/useInspirationLibrary";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";
import { captureEvent } from "@/services/analytics";
import {
  fetchSavedRecommendations,
  logRecommendationEvent,
  requestRecommendationRefresh,
  type DiscoveryContent,
  type ProfileRecommendation,
} from "@/services/discovery";
import {
  DISCOVERY_CATEGORIES,
  editionLabel,
  hasDiscoveryAccess,
  nextStateAfterSaveToggle,
  profileNeedsMoreContext,
} from "@/lib/discovery";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { cn } from "@/lib/utils";

type DiscoverTab = "for-you" | "inspiration" | "saved";

const Discover = () => {
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { profiles, activeProfile, activeProfileId, setActiveProfileId, loading: profilesLoading } =
    useActiveProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 767px)");

  const [tab, setTab] = useState<DiscoverTab>("for-you");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saved, setSaved] = useState<ProfileRecommendation[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  usePageMeta({
    title: "Discover",
    description:
      "A weekly briefing of articles, talks, and research chosen for what you're building — one tap from a tailored analysis.",
    path: "/discover",
    // Signed-in, per-user surface; nothing here belongs in a search index.
    noindex: true,
  });

  const isPremium = hasDiscoveryAccess(subscription?.tier);

  // Discover follows the same "analyzing as" lens the rest of the app uses, so
  // the profile shown here is the profile an Analyze click will run against.
  const feedProfileId = activeProfileId ?? profiles[0]?.id ?? null;
  const feedProfile = profiles.find((p) => p.id === feedProfileId) ?? null;

  const {
    batches,
    selectedBatch,
    selectedBatchId,
    selectBatch,
    recommendations,
    loading: feedLoading,
    itemsLoading,
    error: feedError,
    reload: reloadFeed,
    applyState,
  } = useRecommendations(isPremium ? feedProfileId : null);

  const {
    items: libraryItems,
    loading: libraryLoading,
    loadingMore,
    hasMore,
    loadMore,
  } = useInspirationLibrary(selectedCategories);

  useEffect(() => {
    captureEvent("discovery_viewed", { premium: isPremium, has_profile: Boolean(feedProfileId) });
  }, [isPremium, feedProfileId]);

  // The weekly push lands on /discover?utm_campaign=weekly_discovery, so the
  // notification arm of the funnel is measurable without a separate deep link.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("utm_campaign") === "weekly_discovery") {
      captureEvent("weekly_recommendation_notification_opened", {
        source: params.get("utm_source") ?? "push",
      });
    }
  }, []);

  const loadSaved = useCallback(async () => {
    if (!user) return;
    setSavedLoading(true);
    try {
      setSaved(await fetchSavedRecommendations());
    } catch (error) {
      console.error("Failed to load saved recommendations", error);
    } finally {
      setSavedLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (tab === "saved") void loadSaved();
  }, [tab, loadSaved]);

  // -------------------------------------------------------------- actions ---

  const analyzeContent = useCallback(
    (content: DiscoveryContent, recommendation?: ProfileRecommendation, surface: "for_you" | "inspiration" | "saved" = "for_you") => {
      if (user) {
        const shared = {
          userId: user.id,
          profileId: recommendation?.profile_id ?? feedProfileId,
          recommendationId: recommendation?.id,
          contentId: content.id,
          surface,
          position: recommendation?.position,
          analytics: {
            content_type: content.content_type,
            curated: content.is_curated,
            surface,
            position: recommendation?.position ?? null,
            week: selectedBatch?.week_key ?? null,
          },
        };
        // "opened" is the CTR numerator (count distinct recommendations with an
        // opened event / impressions); the specific action is logged alongside it.
        void logRecommendationEvent("opened", shared);
        void logRecommendationEvent("analyze_clicked", shared);
      }

      // A recommendation from another profile must analyze against that
      // profile, so switch the lens before handing off.
      if (recommendation && recommendation.profile_id !== activeProfileId) {
        setActiveProfileId(recommendation.profile_id);
      }

      // Hand off to the existing analysis pipeline on Home — same path a
      // pasted URL takes (duplicate check, AI consent, usage limits, history).
      navigate("/", {
        state: {
          action: "analyzeUrl",
          url: content.canonical_url || content.url,
          recommendationId: recommendation?.id ?? null,
          ts: Date.now(),
        },
      });
    },
    [activeProfileId, feedProfileId, navigate, selectedBatch?.week_key, setActiveProfileId, user],
  );

  const openSource = useCallback(
    (content: DiscoveryContent, recommendation?: ProfileRecommendation, surface: "for_you" | "inspiration" | "saved" = "for_you") => {
      if (user) {
        const shared = {
          userId: user.id,
          profileId: recommendation?.profile_id ?? feedProfileId,
          recommendationId: recommendation?.id,
          contentId: content.id,
          surface,
          position: recommendation?.position,
          analytics: { content_type: content.content_type, surface, curated: content.is_curated },
        };
        void logRecommendationEvent("opened", shared);
        void logRecommendationEvent("source_opened", shared);
      }
      if (recommendation && recommendation.state === "unseen") {
        void applyState(recommendation.id, "opened");
      }
      // Opens the OS/in-app browser in the native shell (App.tsx intercepts
      // external hosts) and a new tab on the web.
      window.open(content.canonical_url || content.url, "_blank", "noopener,noreferrer");
    },
    [applyState, feedProfileId, user],
  );

  const toggleSave = useCallback(
    async (recommendation: ProfileRecommendation, surface: "for_you" | "saved") => {
      const next = nextStateAfterSaveToggle(recommendation.state);
      const ok = await applyState(recommendation.id, next);
      if (!ok) {
        toast({ title: "Couldn't save that", description: "Please try again.", variant: "destructive" });
        return;
      }
      if (user) {
        void logRecommendationEvent(next === "saved" ? "saved" : "unsaved", {
          userId: user.id,
          profileId: recommendation.profile_id,
          recommendationId: recommendation.id,
          contentId: recommendation.content.id,
          surface,
          position: recommendation.position,
          analytics: { content_type: recommendation.content.content_type, surface },
        });
      }
      if (surface === "saved") void loadSaved();
    },
    [applyState, loadSaved, toast, user],
  );

  const dismiss = useCallback(
    async (recommendation: ProfileRecommendation) => {
      const ok = await applyState(recommendation.id, "dismissed");
      if (!ok) {
        toast({ title: "Couldn't dismiss that", description: "Please try again.", variant: "destructive" });
        return;
      }
      if (user) {
        void logRecommendationEvent("dismissed", {
          userId: user.id,
          profileId: recommendation.profile_id,
          recommendationId: recommendation.id,
          contentId: recommendation.content.id,
          surface: "for_you",
          position: recommendation.position,
          analytics: { content_type: recommendation.content.content_type },
        });
      }
    },
    [applyState, toast, user],
  );

  const refreshRecommendations = useCallback(async () => {
    if (!feedProfileId || refreshing) return;
    triggerHapticFeedback("medium");
    setRefreshing(true);
    try {
      const result = await requestRecommendationRefresh(feedProfileId);
      if (result.status === "ok") {
        // Scheduled generation happens server-side with no client present, so
        // this event only covers manual refreshes; the complete picture lives in
        // recommendation_batches (week_key, status, item_count, generation_stats).
        captureEvent("profile_recommendations_generated", {
          source: "manual",
          item_count: result.itemCount ?? 0,
        });
        toast({
          title: "Recommendations refreshed",
          description: `${result.itemCount ?? 0} new picks for ${feedProfile?.company_name ?? "your profile"}.`,
        });
        await reloadFeed();
      } else {
        toast({
          title: result.status === "rate_limited" ? "Already refreshed today" : "Couldn't refresh",
          description: result.message,
          variant: result.status === "rate_limited" ? "default" : "destructive",
        });
      }
    } finally {
      setRefreshing(false);
    }
  }, [feedProfile?.company_name, feedProfileId, refreshing, reloadFeed, toast]);

  const recordImpression = useCallback(
    (recommendation: ProfileRecommendation, surface: "for_you" | "saved") => {
      if (!user) return;
      if (recommendation.state === "unseen") void applyState(recommendation.id, "viewed");
      void logRecommendationEvent("impression", {
        userId: user.id,
        profileId: recommendation.profile_id,
        recommendationId: recommendation.id,
        contentId: recommendation.content.id,
        surface,
        position: recommendation.position,
        analytics: {
          content_type: recommendation.content.content_type,
          position: recommendation.position,
          surface,
          week: selectedBatch?.week_key ?? null,
        },
      });
    },
    [applyState, selectedBatch?.week_key, user],
  );

  const toggleCategory = (category: string) => {
    triggerHapticFeedback("light");
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category],
    );
  };

  // ------------------------------------------------------------- rendering ---

  const inspirationGrid = useMemo(
    () => (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {libraryItems.map((content) => (
          <DiscoveryCard
            key={content.id}
            content={content}
            onAnalyze={() => analyzeContent(content, undefined, "inspiration")}
            onOpenSource={() => openSource(content, undefined, "inspiration")}
          />
        ))}
      </div>
    ),
    [analyzeContent, libraryItems, openSource],
  );

  if (authLoading || subscriptionLoading || profilesLoading) {
    return <AppLoadingScreen label="Loading Discover..." />;
  }
  if (!user) return <Navigate to="/auth" replace />;

  const showProfilePrompt = isPremium && profiles.length === 0;
  const needsMoreContext = isPremium && profileNeedsMoreContext(feedProfile);

  return (
    // h-screen + flex column, matching Home: PullToRefresh owns the single
    // scrolling element inside it (the Despia pattern), which needs a bounded
    // parent to size against.
    <div className="app-ambient flex h-screen flex-col bg-gradient-to-b from-background to-muted/20">
      <SecondaryPageHeader title="Discover" onBack={() => navigate("/")} />

      <PullToRefresh
        onRefresh={async () => {
          await reloadFeed();
          if (tab === "saved") await loadSaved();
        }}
      >
        <div
          className="container mx-auto max-w-6xl px-4 py-6 sm:py-10"
          style={{ paddingBottom: isMobile ? "calc(5rem + var(--safe-area-bottom))" : undefined }}
        >
          {/* Hero */}
          <header className="mb-6 space-y-3">
            <div className="flex items-center gap-2 text-caption-1 font-medium uppercase tracking-wide text-primary">
              <Compass className="h-4 w-4" />
              Discover
            </div>
            <h1 className="text-title-1 sm:text-large-title">
              Your weekly{" "}
              <span className="font-display font-medium italic text-gradient">Founder Briefing</span>
            </h1>
            <p className="max-w-2xl text-subhead text-muted-foreground">
              {isPremium
                ? "Things worth your attention, chosen for what you're building. One tap turns any of them into a memo for your company."
                : "A library of the kind of material Founder Mode Advice turns into tailored advice. Upgrade to get a personalized set every week."}
            </p>

            {/* Profile lens — the same selector concept used across the app */}
            {isPremium && profiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-footnote text-muted-foreground">Recommendations for</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
                      {feedProfile ? (
                        <Building2 className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="max-w-[180px] truncate">
                        {feedProfile?.company_name ?? "Select a profile"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Recommendations are built per profile
                    </DropdownMenuLabel>
                    {profiles.map((profile) => (
                      <DropdownMenuItem
                        key={profile.id}
                        className="gap-2"
                        onClick={() => setActiveProfileId(profile.id)}
                      >
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="flex-1 truncate">{profile.company_name}</span>
                        {profile.id === feedProfileId && <Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-full text-muted-foreground"
                  onClick={refreshRecommendations}
                  disabled={refreshing || !feedProfileId}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                  {refreshing ? "Refreshing" : "Refresh"}
                </Button>
              </div>
            )}
          </header>

          <Tabs value={tab} onValueChange={(value) => setTab(value as DiscoverTab)}>
            <TabsList className="grid h-11 w-full max-w-md grid-cols-3 sm:h-10">
              <TabsTrigger value="for-you" className="min-h-[44px] text-xs sm:min-h-0 sm:text-sm">
                For You
              </TabsTrigger>
              <TabsTrigger value="inspiration" className="min-h-[44px] text-xs sm:min-h-0 sm:text-sm">
                Inspiration
              </TabsTrigger>
              <TabsTrigger value="saved" className="min-h-[44px] text-xs sm:min-h-0 sm:text-sm">
                Saved
              </TabsTrigger>
            </TabsList>

            {/* ------------------------------------------------------ For You */}
            <TabsContent value="for-you" className="mt-6 space-y-6">
              {!isPremium ? (
                <>
                  <UpgradePrompt
                    message="Personalized weekly recommendations are part of The Boardroom plan."
                    feature="discovery"
                  />
                  <div className="space-y-3">
                    <h2 className="text-title-3">A taste of what we surface</h2>
                    {libraryLoading ? <DiscoveryGridSkeleton count={3} /> : inspirationGrid}
                  </div>
                </>
              ) : showProfilePrompt ? (
                <DiscoverEmptyState
                  title="Tell us what you're building"
                  description="Recommendations are built per business profile. Create one and your first weekly briefing follows."
                  action={{
                    label: "Create a business profile",
                    onClick: () => navigate("/", { state: { panel: "profiles", ts: Date.now() } }),
                  }}
                />
              ) : feedLoading ? (
                <DiscoveryGridSkeleton />
              ) : feedError ? (
                <DiscoverEmptyState
                  title="We couldn't load your briefing"
                  description={feedError}
                  action={{ label: "Try again", onClick: () => void reloadFeed() }}
                />
              ) : (
                <>
                  {/* Weekly edition archive */}
                  {batches.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {batches.map((batch, index) => (
                        <button
                          key={batch.id}
                          type="button"
                          onClick={() => {
                            triggerHapticFeedback("light");
                            selectBatch(batch.id);
                          }}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-caption-1 transition-colors min-h-[36px]",
                            batch.id === selectedBatchId
                              ? "border-primary bg-primary/10 font-semibold text-primary"
                              : "border-border text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {index === 0 ? "This week" : editionLabel(batch.generated_at)}
                        </button>
                      ))}
                    </div>
                  )}

                  {needsMoreContext && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-footnote">
                      Your profile is light on detail, so these picks are broader than they could be.{" "}
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                        onClick={() => navigate("/", { state: { panel: "profiles", ts: Date.now() } })}
                      >
                        Add more about {feedProfile?.company_name ?? "your company"}
                      </button>{" "}
                      to sharpen next week's briefing.
                    </div>
                  )}

                  {itemsLoading ? (
                    <DiscoveryGridSkeleton />
                  ) : recommendations.length > 0 ? (
                    <>
                      <div className="flex items-baseline justify-between gap-3">
                        <h2 className="text-title-3">
                          {recommendations.length} ideas worth your attention
                        </h2>
                        {selectedBatch && (
                          <Badge variant="secondary" className="shrink-0 rounded-full">
                            {editionLabel(selectedBatch.generated_at)}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {recommendations.map((recommendation) => (
                          <DiscoveryCard
                            key={recommendation.id}
                            content={recommendation.content}
                            reason={recommendation.reason}
                            state={recommendation.state}
                            onImpression={() => recordImpression(recommendation, "for_you")}
                            onAnalyze={() => analyzeContent(recommendation.content, recommendation, "for_you")}
                            onOpenSource={() => openSource(recommendation.content, recommendation, "for_you")}
                            onToggleSave={() => void toggleSave(recommendation, "for_you")}
                            onDismiss={() => void dismiss(recommendation)}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <DiscoverEmptyState
                        title={`We're finding resources based on ${feedProfile?.company_name ?? "your profile"}`}
                        description="Your first briefing is generated on our weekly cycle. In the meantime, here's the Inspiration Library — every item works with Analyze."
                        action={{ label: "Refresh now", onClick: () => void refreshRecommendations() }}
                        secondaryAction={{ label: "Browse inspiration", onClick: () => setTab("inspiration") }}
                      />
                      {libraryLoading ? <DiscoveryGridSkeleton count={3} /> : inspirationGrid}
                    </>
                  )}
                </>
              )}
            </TabsContent>

            {/* -------------------------------------------------- Inspiration */}
            <TabsContent value="inspiration" className="mt-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-caption-1 transition-colors min-h-[36px]",
                    selectedCategories.length === 0
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  All
                </button>
                {DISCOVERY_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-caption-1 transition-colors min-h-[36px]",
                      selectedCategories.includes(category)
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                    aria-pressed={selectedCategories.includes(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {libraryLoading ? (
                <DiscoveryGridSkeleton />
              ) : libraryItems.length === 0 ? (
                <DiscoverEmptyState
                  title="Nothing here yet"
                  description="No library items match those categories. Clear the filters to see everything."
                  action={{ label: "Clear filters", onClick: () => setSelectedCategories([]) }}
                />
              ) : (
                <>
                  {inspirationGrid}
                  {hasMore && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        className="min-h-[44px] rounded-full sm:min-h-0"
                        onClick={() => void loadMore()}
                        disabled={loadingMore}
                      >
                        {loadingMore ? "Loading..." : "Load more"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* -------------------------------------------------------- Saved */}
            <TabsContent value="saved" className="mt-6 space-y-5">
              {savedLoading ? (
                <DiscoveryGridSkeleton count={3} />
              ) : saved.length === 0 ? (
                <DiscoverEmptyState
                  title="Nothing saved yet"
                  description="Tap the bookmark on any recommendation to keep it here for later."
                  action={{ label: "Back to your briefing", onClick: () => setTab("for-you") }}
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {saved.map((recommendation) => (
                    <DiscoveryCard
                      key={recommendation.id}
                      content={recommendation.content}
                      reason={recommendation.reason}
                      state={recommendation.state}
                      onAnalyze={() => analyzeContent(recommendation.content, recommendation, "saved")}
                      onOpenSource={() => openSource(recommendation.content, recommendation, "saved")}
                      onToggleSave={() => void toggleSave(recommendation, "saved")}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </PullToRefresh>
    </div>
  );
};

export default Discover;
