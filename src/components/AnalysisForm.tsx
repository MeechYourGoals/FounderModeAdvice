import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, FastForward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { isUnlimited } from "@/types/subscription";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StartupProfileForm } from "./StartupProfileForm";
import { UpgradePrompt } from "./subscription";
import { triggerHapticFeedback } from "@/lib/capacitor";

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

export const AnalysisForm = () => {
  const [episodeUrl, setEpisodeUrl] = useState("");
  const [podcastName, setPodcastName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [inputMode, setInputMode] = useState<"series" | "url">("url");
  const [step, setStep] = useState<"episode" | "profile">("episode");
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [startupContext, setStartupContext] = useState<any>(null);
  const { toast } = useToast();
  const { subscription, canAnalyzeVideo, refreshSubscription } = useSubscription();
  const { activeProfile, refreshProfiles } = useActiveProfile();
  const profileLimit = subscription?.limits.profiles.max || 1;

  useEffect(() => {
    fetchSavedProfiles();
  }, [subscription]);

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

  const handleEpisodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // With an active business profile, analyze directly with that context;
    // otherwise drop into the manual context step.
    validateAndProceed(activeProfile ? "active" : "profile");
  };

  // Starter videos from the empty state dispatch this with a URL to one-tap analyze.
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent<{ url: string }>).detail?.url;
      if (!url) return;
      setEpisodeUrl(url);
      const analysisCheck = canAnalyzeVideo();
      if (!analysisCheck.allowed) {
        toast({
          title: "Analysis Limit Reached",
          description: analysisCheck.message || "Upgrade to analyze more videos.",
          variant: "destructive",
        });
        return;
      }
      analyzeWithContext(activeProfile, url);
    };
    window.addEventListener("analyzeUrl", handler as EventListener);
    return () => window.removeEventListener("analyzeUrl", handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  const handleQuickImport = (e: React.MouseEvent) => {
    e.preventDefault();
    validateAndProceed("quick");
  };

  const validateAndProceed = (mode: "profile" | "quick" | "active") => {
    if (!episodeUrl.trim()) {
      triggerHapticFeedback('medium');
      toast({
        title: "Missing Information",
        description: "Please enter an episode URL",
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

  const analyzeWithContext = async (profile: any, urlArg?: string) => {
    const url = (urlArg ?? episodeUrl).trim();
    if (!url) return;
    setIsAnalyzing(true);
    setProgress(profile ? "Analyzing with your business context..." : "Analyzing episode...");

    try {
      setProgress("Checking for duplicates...");
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = user?.id
        ? await supabase
            .from('episodes')
            .select('id, title, url')
            .eq('url', url)
            .eq('analyzed_by', user.id)
            .limit(1)
        : await supabase
            .from('episodes')
            .select('id, title, url')
            .eq('url', url)
            .limit(1);

      if (existing && existing.length > 0) {
        toast({
          title: "Episode already analyzed",
          description: `"${existing[0].title}" has already been analyzed. View it in your episodes list.`,
        });
        setIsAnalyzing(false);
        setProgress("");
        window.dispatchEvent(new CustomEvent('episodeAnalyzed'));
        return;
      }

      setProgress("Fetching episode data...");
      const { data, error } = await supabase.functions.invoke('analyze-episode', {
        body: {
          episodeUrl: url,
          podcastName: podcastName.trim() || undefined,
          startupProfile: profile,
          deckSummary: profile?.deck_summary || undefined
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
        return;
      }

      setProgress("Generating insights...");

      triggerHapticFeedback('heavy');
      // Server-side already increments the analysis count via RPC; just refresh the UI
      await refreshSubscription();

      toast({
        title: "Analysis complete!",
        description: "Episode analyzed successfully.",
      });

      setEpisodeUrl("");
      setPodcastName("");
      setStep("episode");
      setStartupContext(null);

      window.dispatchEvent(new CustomEvent('episodeAnalyzed'));
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setProgress("");
    }
  };

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
      </div>
    );
  }

  const analysisCheck = canAnalyzeVideo();

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

      <form onSubmit={handleEpisodeSubmit} className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">
            Analyze a{" "}
            <span className="font-display font-medium italic text-gradient">new video</span>
          </h2>
          <p className="text-muted-foreground">
            Paste any video URL and let AI extract advice tailored to you
          </p>
        </div>

        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "series" | "url")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto h-11 sm:h-10">
            <TabsTrigger value="series" className="text-xs sm:text-sm min-h-[44px] sm:min-h-0">By Source</TabsTrigger>
            <TabsTrigger value="url" className="text-xs sm:text-sm min-h-[44px] sm:min-h-0">Direct URL</TabsTrigger>
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
                Video URL
              </label>
              <Input
                id="episodeUrlSeries"
                type="url"
                placeholder="YouTube, TikTok, Instagram, X, Vimeo, or any public video link"
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
                Video URL
              </label>
              <Input
                id="episodeUrlDirect"
                type="url"
                placeholder="Paste a YouTube, TikTok, Instagram, X, Vimeo, or any public video link"
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
        </Tabs>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button
            type="submit"
            disabled={isAnalyzing || !analysisCheck.allowed}
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
            ) : activeProfile ? (
              <>Analyze for {activeProfile.company_name}</>
            ) : (
              <>Analyze (Personalized)</>
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
              Quick Import
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};
