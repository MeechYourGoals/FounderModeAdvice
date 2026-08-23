import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, FastForward, Building2, Check, ChevronDown, Globe } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAIConsent } from "@/hooks/useAIConsent";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { canBatchAnalyzeProfiles, isUnlimited } from "@/types/subscription";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StartupProfileForm } from "./StartupProfileForm";
import { AnalyzingScene } from "./AnalyzingScene";
import { SourceUploadZone } from "./SourceUploadZone";
import { SuccessMoment } from "./SuccessMoment";
import { UpgradePrompt } from "./subscription";
import { markRecommendationAnalyzed } from "@/services/discovery";
import { triggerHapticFeedback } from "@/lib/capacitor";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const POPULAR_SOURCES = [
  "TED",
  "Y Combinator",
  "a16z",
  "How I Built This",
  "Acquired",
  "20VC",
  "Lenny's Podcast",
];

interface SavedProfile {
  id: string;
  company_name: string;
  company_website: string | null;
  stage: string;
  funding_raised: string | null;
  valuation: string | null;
  employee_count: number | null;
  industry: string | null;
  description: string;
  deck_summary?: string | null;
  role?: string | null;
}

interface AnalysisFormProps {
  /** composer = quiet capture on today's desk; expands when writing. */
  variant?: "default" | "composer";
  /** Hide the collapsed composer while a memo is open; stay mounted for events. */
  inactive?: boolean;
}

export const AnalysisForm = ({ variant = "default", inactive = false }: AnalysisFormProps) => {
  const [episodeUrl, setEpisodeUrl] = useState("");
  const [composerOpen, setComposerOpen] = useState(variant !== "composer");
  const [podcastName, setPodcastName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [inputMode, setInputMode] = useState<"series" | "url" | "upload">("url");
  // Optional per-analysis instructions to tailor the insights (not required).
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  // True while an upload is uploading/analyzing so the shared instructions lock.
  const [uploadBusy, setUploadBusy] = useState(false);
  const [step, setStep] = useState<"episode" | "profile">("episode");
  const [celebrating, setCelebrating] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [startupContext, setStartupContext] = useState<any>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const { toast } = useToast();
  const { ensureAIConsent, aiConsentDialog } = useAIConsent();
  const { subscription, canAnalyzeVideo, refreshSubscription } = useSubscription();
  const { activeProfile, activeProfileId, setActiveProfileId, profiles, refreshProfiles } = useActiveProfile();
  const profileLimit = subscription?.limits.profiles.max || 1;
  const canBatchProfiles = subscription ? canBatchAnalyzeProfiles(subscription.tier) : false;
  const isPremium = subscription ? subscription.tier !== "free" : false;

  // One-time payoff for the user's very first memo (portal — renders anywhere).
  const successMoment = (
    <SuccessMoment
      show={celebrating}
      title="First memo ready"
      subtitle="I added it to today's desk."
      onDone={() => setCelebrating(false)}
    />
  );

  // Depend on the derived limit, not the subscription object — refreshSubscription()
  // creates a new object after every analysis, which would re-fetch profiles each time.
  useEffect(() => {
    fetchSavedProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLimit]);

  useEffect(() => {
    if (canBatchProfiles) {
      if (selectedProfileIds.length === 0 && activeProfileId) {
        setSelectedProfileIds([activeProfileId]);
      }
      return;
    }
    if (activeProfileId) {
      setSelectedProfileIds([activeProfileId]);
    } else {
      setSelectedProfileIds([]);
    }
  }, [activeProfileId, canBatchProfiles, selectedProfileIds.length]);

  const fetchSavedProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("user_startup_profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(profileLimit);

      if (error) throw error;
      setSavedProfiles(data || []);
    } catch (error) {
      console.error("Error fetching saved profiles:", error);
    }
  };

  const handleEpisodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAnalyzeSelectedProfiles();
  };

  // One-tap analyze from starter videos and from Discover recommendations.
  // Both go through this single path so there is one analysis pipeline.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ url: string; recommendationId?: string | null }>).detail;
      const url = detail?.url;
      if (!url) return;
      if (isAnalyzing) return; // an analysis is already running — ignore repeat taps
      setComposerOpen(true);
      setEpisodeUrl(url);
      const analysisCheck = canAnalyzeVideo();
      if (!analysisCheck.allowed) {
        toast({
          title: "Analysis Limit Reached",
          description: analysisCheck.message || "Upgrade to analyze more sources.",
          variant: "destructive",
        });
        return;
      }
      void (async () => {
        const result = await analyzeWithContext(activeProfile, url, {
          profileId: activeProfileId,
        });
        if (!detail?.recommendationId) return;
        // Close the loop for Discover: mark the recommendation analyzed and
        // link the resulting (or already existing) memo. Failures here are
        // logged inside the service — the analysis itself already succeeded.
        if (result?.success && result.episodeId) {
          await markRecommendationAnalyzed(detail.recommendationId, result.episodeId);
        } else if (result?.reason === "duplicate" && result.episodeId) {
          await markRecommendationAnalyzed(detail.recommendationId, result.episodeId);
        }
      })();
    };
    window.addEventListener("analyzeUrl", handler as EventListener);
    return () => window.removeEventListener("analyzeUrl", handler as EventListener);
    // customPrompt included so the starter-video path forwards the user's current
    // instructions instead of a stale (empty) closure value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile, activeProfileId, isAnalyzing, customPrompt]);

  useEffect(() => {
    const expand = () => setComposerOpen(true);
    window.addEventListener("openAnalyze", expand);
    return () => window.removeEventListener("openAnalyze", expand);
  }, []);

  const handleQuickImport = (e: React.MouseEvent) => {
    e.preventDefault();
    validateAndProceed("quick");
  };

  const validateAndProceed = (mode: "profile" | "quick" | "active") => {
    if (!episodeUrl.trim()) {
      triggerHapticFeedback('medium');
      toast({
        title: "Missing Information",
        description: "Please enter a source URL",
        variant: "destructive",
      });
      return;
    }

    // Check analysis limit before proceeding
    const analysisCheck = canAnalyzeVideo();
    if (!analysisCheck.allowed) {
      triggerHapticFeedback('medium');
      toast({
        title: "Analysis Limit Reached",
        description: analysisCheck.message || "Upgrade to analyze more videos.",
        variant: "destructive",
      });
      return;
    }

    triggerHapticFeedback('light');
    if (mode === "quick") {
      analyzeWithContext(null);
    } else if (mode === "active") {
      analyzeWithContext(activeProfile);
    } else {
      setStep("profile");
    }
  };

  const handleProfileSubmit = async (profile: any, saveProfile: boolean) => {
    triggerHapticFeedback('medium');
    setStartupContext(profile);

    if (saveProfile) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("user_startup_profiles").insert([{
          ...profile,
          user_id: user?.id
        }]);
        fetchSavedProfiles();
        refreshProfiles();
        window.dispatchEvent(new Event("profilesChanged"));
      } catch (error) {
        console.error("Error saving profile:", error);
      }
    }

    // Check if profile has meaningful data - if all key fields are empty, pass null
    const hasData = profile.company_name || profile.stage || profile.description;
    await analyzeWithContext(hasData ? profile : null);
  };

  const normalizeUrl = (url: string): string => {
    try {
      const parsed = new URL(url.trim());
      if (parsed.hostname.includes('youtu.be')) {
        const videoId = parsed.pathname.split('/').pop();
        return `youtube.com/watch?v=${videoId}`;
      }
      if (parsed.hostname.includes('youtube.com')) {
        const videoId = parsed.searchParams.get('v');
        if (videoId) return `youtube.com/watch?v=${videoId}`;
      }
      return parsed.hostname + parsed.pathname;
    } catch {
      return url.trim().toLowerCase();
    }
  };

  const analyzeWithContext = async (
    profile: any,
    urlArg?: string,
    options?: { profileId?: string | null; progressLabel?: string; manageState?: boolean },
  ) => {
    const url = (urlArg ?? episodeUrl).trim();
    if (!url) return;
    // One-time disclosure/permission before content is sent to AI providers.
    // Batch runs pass `manageState:false` per profile; consent is resolved once
    // by the first call and instantly for the rest.
    if (!(await ensureAIConsent())) return { success: false, reason: "consent" as const };
    const manageState = options?.manageState ?? true;
    if (manageState) {
      setIsAnalyzing(true);
      setProgress(options?.progressLabel || (profile ? "Analyzing with your business context..." : "Analyzing episode..."));
    }

    // Custom instructions produce a distinct, tailored analysis, so a URL the user
    // already analyzed should not be blocked as a duplicate in that case.
    const hasCustomInstructions = customPrompt.trim().length > 0;

    try {
      if (!hasCustomInstructions) {
        if (manageState) setProgress("Checking for duplicates...");
        const { data: { user } } = await supabase.auth.getUser();
        const existingQuery = user?.id
          ? supabase
              .from('episodes')
              .select('id, title, url')
              .eq('url', url)
              .eq('analyzed_by', user.id)
              .limit(1)
          : supabase
              .from('episodes')
              .select('id, title, url')
              .eq('url', url)
              .limit(1);

        const { data: existing } = await existingQuery;

        if (existing && existing.length > 0) {
          if (manageState) {
            toast({
              title: "This memo is already on your desk",
              description: `Opening “${existing[0].title}”.`,
            });
            setIsAnalyzing(false);
            setProgress("");
            window.dispatchEvent(new CustomEvent('episodeAnalyzed'));
            // Surface the existing memo instead of leaving the user on an
            // empty form wondering where it went.
            window.dispatchEvent(
              new CustomEvent('openEpisode', { detail: { episodeId: existing[0].id } }),
            );
          }
          return { success: false, reason: "duplicate" as const, episodeId: existing[0].id as string };
        }
      }

      if (manageState) setProgress("Fetching episode data...");
      const { data, error } = await supabase.functions.invoke('analyze-episode', {
        body: {
          episodeUrl: url,
          podcastName: podcastName.trim() || undefined,
          startupProfile: profile,
          startupProfileId: options?.profileId || undefined,
          deckSummary: profile?.deck_summary || undefined,
          customPrompt: customPrompt.trim() || undefined
        }
      });

      if (error) {
        console.error("Analysis error:", error);
        triggerHapticFeedback('medium');
        toast({
          title: "Analysis Failed",
          description: error.message || "Failed to analyze episode. Please try again.",
          variant: "destructive",
        });
        return { success: false, reason: "error" as const, message: error.message };
      }

      if (manageState) setProgress("Generating insights...");

      // UIKit success pattern — the payoff for the wait.
      triggerHapticFeedback('success');
      // Server-side already increments the analysis count via RPC; just refresh the UI
      await refreshSubscription();

      if (manageState) {
        // First-ever memo gets a one-time celebration; later ones keep the
        // quieter toast so the payoff never turns into noise.
        const firstMemoKey = "fma_first_memo_celebrated";
        if (!localStorage.getItem(firstMemoKey)) {
          localStorage.setItem(firstMemoKey, "true");
          setCelebrating(true);
        }
        toast({
          title: "Memo ready",
          description: "I added it to today's desk.",
        });

        setEpisodeUrl("");
        setPodcastName("");
        setCustomPrompt("");
        setShowCustomPrompt(false);
        setStep("episode");
        setStartupContext(null);
        if (variant === "composer") setComposerOpen(false);
        window.dispatchEvent(new CustomEvent('episodeAnalyzed'));
      }
      return { success: true as const, episodeId: data?.episodeId as string | undefined };
    } catch (error) {
      console.error('Analysis error:', error);
      if (manageState) {
        toast({
          title: "Analysis failed",
          description: error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        });
      }
      return { success: false as const, reason: "error" as const, message: error instanceof Error ? error.message : "Please try again" };
    } finally {
      if (manageState) {
        setIsAnalyzing(false);
        setProgress("");
      }
    }
  };

  const handleAnalyzeSelectedProfiles = async () => {
    if (canBatchProfiles && selectedProfileIds.length > 1) {
      if (!episodeUrl.trim()) {
        toast({ title: "Missing Information", description: "Please enter an episode URL", variant: "destructive" });
        return;
      }

      if (!subscription) return;
      if (!isUnlimited(subscription.limits.analyses.max)) {
        const remaining = subscription.limits.analyses.max - subscription.limits.analyses.used;
        if (remaining < selectedProfileIds.length) {
          toast({
            title: "Not enough analyses remaining",
            description: `You selected ${selectedProfileIds.length} profiles but only have ${remaining} analyses left this month.`,
            variant: "destructive",
          });
          return;
        }
      }

      const selectedProfiles = profiles.filter((profile) => selectedProfileIds.includes(profile.id));
      if (selectedProfiles.length === 0) {
        toast({ title: "Select at least one profile", description: "Choose one or more profiles before submitting.", variant: "destructive" });
        return;
      }

      // Resolve AI-processing consent once up front so a decline doesn't
      // re-prompt for every profile in the batch.
      if (!(await ensureAIConsent())) return;

      setIsAnalyzing(true);
      const successes: { name: string; episodeId?: string }[] = [];
      const failures: { name: string; message: string }[] = [];

      for (let i = 0; i < selectedProfiles.length; i += 1) {
        const profile = selectedProfiles[i];
        setProgress(`Analyzing for ${selectedProfiles.length} profiles… (${i + 1}/${selectedProfiles.length})`);
        const result = await analyzeWithContext(profile, undefined, {
          profileId: profile.id,
          manageState: false,
        });

        if (result?.success) {
          successes.push({ name: profile.company_name, episodeId: result.episodeId });
        } else {
          failures.push({ name: profile.company_name, message: result?.message || "Could not create analysis." });
        }
      }

      setIsAnalyzing(false);
      setProgress("");
      await refreshSubscription();
      window.dispatchEvent(new CustomEvent('episodeAnalyzed'));

      // Batch uses manageState:false, so clear the shared instructions here too.
      if (successes.length > 0) {
        setCustomPrompt("");
        setShowCustomPrompt(false);
      }

      if (successes.length > 0 && failures.length === 0) {
        toast({
          title: "Batch analysis complete",
          description: `Created ${successes.length} analyses successfully.`,
        });
      } else if (successes.length > 0 && failures.length > 0) {
        toast({
          title: "Batch analysis partially complete",
          description: `${successes.length} succeeded, ${failures.length} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Batch analysis failed",
          description: "No analyses were created. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    // With an active business profile, analyze directly with that context;
    // otherwise drop into the manual context step.
    if (!canBatchProfiles && selectedProfileIds.length === 0 && activeProfileId === null) {
      validateAndProceed("quick");
      return;
    }
    validateAndProceed(activeProfile ? "active" : "profile");
  };

  const selectedProfiles = profiles.filter((profile) => selectedProfileIds.includes(profile.id));
  const selectedProfileLabel = canBatchProfiles
    ? selectedProfiles.length === 1
      ? selectedProfiles[0].company_name
      : selectedProfiles.length > 1
        ? `${selectedProfiles.length} profiles`
        : "No profiles selected"
    : activeProfile?.company_name || "Universal";

  if (step === "profile") {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setStep("episode")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Episode URL
        </Button>
        <StartupProfileForm
          onSubmit={handleProfileSubmit}
          savedProfiles={savedProfiles}
          isAnalyzing={isAnalyzing}
        />
        {aiConsentDialog}
        {successMoment}
      </div>
    );
  }

  const analysisCheck = canAnalyzeVideo();
  const collapsedComposer = variant === "composer" && !composerOpen && !isAnalyzing;

  if (inactive && collapsedComposer) {
    return (
      <>
        {aiConsentDialog}
        {successMoment}
      </>
    );
  }

  if (collapsedComposer) {
    return (
      <Card className="relative overflow-hidden p-4 sm:p-5 shadow-md border-primary/10">
        <div aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "var(--gradient-primary)" }} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="text-title-3">
              Have a source?{" "}
              <span className="font-display font-medium italic text-gradient">I'll write the memo</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeProfile
                ? `Drop in a link or document for ${activeProfile.company_name}.`
                : "Drop in a public link or a private document."}
            </p>
          </div>
          <Button
            className="min-h-[44px] rounded-full sm:min-h-0"
            onClick={() => {
              triggerHapticFeedback("light");
              setComposerOpen(true);
            }}
          >
            Bring a source
          </Button>
        </div>
        {aiConsentDialog}
        {successMoment}
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden p-4 sm:p-8 shadow-lg border-primary/10 hover:shadow-elegant transition-shadow duration-300">
      {/* Brand accent hairline across the top of the analyze surface */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: 'var(--gradient-primary)' }} />
      {!analysisCheck.allowed && (
        <div className="mb-6">
          <UpgradePrompt
            message={analysisCheck.message || "You've used all your free analyses this month"}
            feature="analysis"
          />
        </div>
      )}

      {analysisCheck.allowed && subscription && (
        <div className="mb-3 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            {isUnlimited(subscription.limits.analyses.max)
              ? `${subscription.limits.analyses.used} analyses this month · Unlimited`
              : `${subscription.limits.analyses.used}/${subscription.limits.analyses.max} analyses used this month`}
          </span>
        </div>
      )}

      {analysisCheck.allowed && (
        <p className="mb-4 text-center text-xs text-muted-foreground">
          {activeProfile ? (
            <>
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" aria-hidden />{" "}
              Personalizing for <span className="font-medium text-foreground">{activeProfile.company_name}</span>
            </>
          ) : (
            <>Universal mode (no business profile)</>
          )}{" "}
          ·{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => window.dispatchEvent(new Event("openProfiles"))}
          >
            Change
          </button>
        </p>
      )}

      {isAnalyzing ? (
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-title-2 sm:text-title-1 text-center">
              Writing your{" "}
              <span className="font-display font-medium italic text-gradient">memo</span>
            </h2>
          </div>
          <AnalyzingScene
            companyName={selectedProfiles[0]?.company_name || activeProfile?.company_name}
            batchLabel={canBatchProfiles && selectedProfileIds.length > 1 ? progress : undefined}
          />
        </div>
      ) : (
      <form onSubmit={handleEpisodeSubmit} className="space-y-6">
        <div className="space-y-2 text-center">
            <h2 className="text-title-2 sm:text-title-1 text-center">
            Write a{" "}
            <span className="font-display font-medium italic text-gradient">memo</span>
          </h2>
          <p className="text-muted-foreground">
            Drop in a public link or a private document. I'll write the memo for your company.
          </p>
          {variant === "composer" && (
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => setComposerOpen(false)}
            >
              Not now
            </button>
          )}
        </div>

        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "series" | "url" | "upload")} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto h-11 sm:h-10">
            <TabsTrigger value="series" className="text-xs sm:text-sm min-h-[44px] sm:min-h-0">By Source</TabsTrigger>
            <TabsTrigger value="url" className="text-xs sm:text-sm min-h-[44px] sm:min-h-0">Direct URL</TabsTrigger>
            <TabsTrigger value="upload" className="text-xs sm:text-sm min-h-[44px] sm:min-h-0">Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="series" className="space-y-4 mt-6">
            <div className="space-y-2 max-w-xl mx-auto">
              <label htmlFor="podcastNameSeries" className="text-sm font-medium">
                Source / Creator
              </label>
              <Input
                id="podcastNameSeries"
                placeholder="e.g., a show, channel, or speaker's name"
                value={podcastName}
                onChange={(e) => setPodcastName(e.target.value)}
                disabled={isAnalyzing}
                list="popular-sources"
                className="text-center"
              />
              <datalist id="popular-sources">
                {POPULAR_SOURCES.map((source) => (
                  <option key={source} value={source} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <label htmlFor="episodeUrlSeries" className="text-sm font-medium">
                Source URL
              </label>
              <Input
                id="episodeUrlSeries"
                type="url"
                placeholder="Article, post, video, Substack, tweet, podcast, or any public URL"
                value={episodeUrl}
                onChange={(e) => setEpisodeUrl(e.target.value)}
                disabled={isAnalyzing}
                className="text-center"
              />
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4 mt-6">
            <div className="space-y-2 max-w-xl mx-auto">
              <label htmlFor="episodeUrlDirect" className="text-sm font-medium text-center block">
                Source URL
              </label>
              <Input
                id="episodeUrlDirect"
                type="url"
                placeholder="Paste an article, post, video, Substack, tweet, or any public URL"
                value={episodeUrl}
                onChange={(e) => setEpisodeUrl(e.target.value)}
                disabled={isAnalyzing}
                className="rounded-full text-center text-base sm:text-lg py-5 sm:py-6 min-h-[48px] shadow-sm"
              />
              <p className="text-xs text-muted-foreground text-center">
                Source will be auto-detected
              </p>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-6">
            <SourceUploadZone
              isPremium={isPremium}
              canAnalyze={analysisCheck.allowed}
              activeProfile={activeProfile}
              activeProfileId={activeProfileId}
              customPrompt={customPrompt.trim() || undefined}
              onProcessingChange={setUploadBusy}
              onAnalyzed={() => { setCustomPrompt(""); setShowCustomPrompt(false); }}
            />
          </TabsContent>
        </Tabs>

        {/* Optional custom instructions — preface any analysis to tailor the insights. */}
        <div className="max-w-xl mx-auto">
          {!showCustomPrompt && !customPrompt ? (
            <button
              type="button"
              onClick={() => setShowCustomPrompt(true)}
              disabled={isAnalyzing || uploadBusy}
              className="mx-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground min-h-[44px] sm:min-h-0"
            >
              Add custom instructions
              <span className="text-muted-foreground/70">(optional)</span>
            </button>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="customPrompt" className="flex items-center gap-1.5 text-sm font-medium">
                Custom instructions
                <span className="font-normal text-muted-foreground">— optional</span>
              </label>
              <Textarea
                id="customPrompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isAnalyzing || uploadBusy}
                rows={3}
                maxLength={2000}
                placeholder="Preface this analysis with your exact situation or question — e.g. “I own two car washes doing $1.4M and $1.1M and I’m eyeing a third for $2.1M. Given this source, how should I evaluate the deal and structure my next 90 days?”"
                className="resize-y text-sm min-h-[92px]"
              />
              <p className="text-xs text-muted-foreground">
                I'll use this to shape the advice. Leave blank for lessons from the source only.
              </p>
            </div>
          )}
        </div>

        {inputMode !== "upload" && (
        <div className="space-y-3">
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isAnalyzing || !analysisCheck.allowed}
                  className="w-full sm:w-auto min-w-[280px] justify-between rounded-full"
                >
                  <span className="inline-flex items-center gap-2 truncate">
                    {selectedProfiles.length > 0 ? (
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">Write for {selectedProfileLabel}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-72">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {canBatchProfiles ? "Select one or more profiles" : "Select active profile"}
                </DropdownMenuLabel>
                {!canBatchProfiles && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        setActiveProfileId(null);
                        setSelectedProfileIds([]);
                      }}
                      className="gap-2"
                    >
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">Universal (no profile)</span>
                      {selectedProfileIds.length === 0 && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {profiles.map((profile) => (
                  canBatchProfiles ? (
                    <DropdownMenuCheckboxItem
                      key={profile.id}
                      checked={selectedProfileIds.includes(profile.id)}
                      onCheckedChange={(checked) => {
                        setSelectedProfileIds((prev) => {
                          if (checked) {
                            if (!prev.includes(profile.id)) {
                              setActiveProfileId(profile.id);
                              return [...prev, profile.id];
                            }
                            return prev;
                          }
                          return prev.filter((id) => id !== profile.id);
                        });
                      }}
                    >
                      {profile.company_name}
                    </DropdownMenuCheckboxItem>
                  ) : (
                    <DropdownMenuItem
                      key={profile.id}
                      onClick={() => {
                        setActiveProfileId(profile.id);
                        setSelectedProfileIds([profile.id]);
                      }}
                      className="gap-2"
                    >
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="flex-1">{profile.company_name}</span>
                      {selectedProfileIds.includes(profile.id) && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  )
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button
            type="submit"
            disabled={isAnalyzing || !analysisCheck.allowed || (canBatchProfiles && selectedProfileIds.length === 0)}
            size="lg"
            className="min-w-[200px] min-h-[48px] sm:min-h-0 rounded-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {progress || "Analyzing..."}
              </>
            ) : !analysisCheck.allowed ? (
              <>
                Upgrade to Continue
              </>
            ) : canBatchProfiles && selectedProfileIds.length > 1 ? (
              <>Prepare memo for {selectedProfileIds.length} profiles</>
            ) : selectedProfiles.length === 1 ? (
              <>Prepare memo for {selectedProfiles[0].company_name}</>
            ) : activeProfile ? (
              <>Prepare memo for {activeProfile.company_name}</>
            ) : (
              <>Add context &amp; write the memo</>
            )}
          </Button>

          {analysisCheck.allowed && !isAnalyzing && (
            <Button
              type="button"
              variant="outline"
              disabled={isAnalyzing}
              onClick={handleQuickImport}
              size="lg"
              className="min-w-[150px] min-h-[48px] sm:min-h-0 rounded-full"
            >
              <FastForward className="mr-2 h-4 w-4" />
              Quick memo
            </Button>
          )}
        </div>
        </div>
        )}
      </form>
      )}
      {aiConsentDialog}
      {successMoment}
    </Card>
  );
};
