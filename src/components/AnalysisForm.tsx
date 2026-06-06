import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, ArrowLeft, Zap, FastForward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StartupProfileForm } from "./StartupProfileForm";
import { UpgradePrompt } from "./subscription";
import { triggerHapticFeedback } from "@/lib/capacitor";

const POPULAR_PODCASTS = [
  "Crucible Moments",
  "Founders",
  "Y Combinator",
  "a16z",
  "How I Built This",
  "Acquired",
  "20VC",
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
    validateAndProceed("profile");
  };

  const handleQuickImport = (e: React.MouseEvent) => {
    e.preventDefault();
    validateAndProceed("quick");
  };

  const validateAndProceed = (mode: "profile" | "quick") => {
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

  const analyzeWithContext = async (profile: any) => {
    setIsAnalyzing(true);
    setProgress(profile ? "Analyzing episode with your startup context..." : "Analyzing episode...");

    try {
      setProgress("Checking for duplicates...");
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = user?.id
        ? await supabase
            .from('episodes')
            .select('id, title, url')
            .eq('url', episodeUrl.trim())
            .eq('analyzed_by', user.id)
            .limit(1)
        : await supabase
            .from('episodes')
            .select('id, title, url')
            .eq('url', episodeUrl.trim())
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
          episodeUrl, 
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
    <Card className="p-4 sm:p-8 shadow-lg border-primary/10 hover:shadow-xl transition-shadow">
      {!analysisCheck.allowed && (
        <div className="mb-6">
          <UpgradePrompt
            message={analysisCheck.message || "You've used all your free analyses this month"}
            feature="analysis"
          />
        </div>
      )}

      {analysisCheck.allowed && subscription && (
        <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4" />
          <span>
            {subscription.limits.analyses.used}/{subscription.limits.analyses.max} analyses used this month
          </span>
        </div>
      )}

      <form onSubmit={handleEpisodeSubmit} className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Analyze New Episode
          </h2>
          <p className="text-muted-foreground">
            Paste a podcast episode URL and let AI extract the founder lessons
          </p>
        </div>

        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "series" | "url")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto h-11 sm:h-10">
            <TabsTrigger value="series" className="text-xs sm:text-sm min-h-[44px] sm:min-h-0">By Podcast Series</TabsTrigger>
            <TabsTrigger value="url" className="text-xs sm:text-sm min-h-[44px] sm:min-h-0">Direct URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="series" className="space-y-4 mt-6">
            <div className="space-y-2 max-w-xl mx-auto">
              <label htmlFor="podcastNameSeries" className="text-sm font-medium">
                Podcast Series Name
              </label>
              <Input
                id="podcastNameSeries"
                placeholder="e.g., Crucible Moments, How I Built This"
                value={podcastName}
                onChange={(e) => setPodcastName(e.target.value)}
                disabled={isAnalyzing}
                list="popular-podcasts"
                className="text-center"
              />
              <datalist id="popular-podcasts">
                {POPULAR_PODCASTS.map((podcast) => (
                  <option key={podcast} value={podcast} />
                ))}
              </datalist>
            </div>
            
            <div className="space-y-2 max-w-xl mx-auto">
              <label htmlFor="episodeUrlSeries" className="text-sm font-medium">
                Episode URL
              </label>
              <Input
                id="episodeUrlSeries"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
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
                Episode URL
              </label>
              <Input
                id="episodeUrlDirect"
                type="url"
                placeholder="https://youtube.com/watch?v=... or Spotify link"
                value={episodeUrl}
                onChange={(e) => setEpisodeUrl(e.target.value)}
                disabled={isAnalyzing}
                className="text-center text-base sm:text-lg py-5 sm:py-6 min-h-[48px]"
              />
              <p className="text-xs text-muted-foreground text-center">
                Podcast series will be auto-detected
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button
            type="submit"
            disabled={isAnalyzing || !analysisCheck.allowed}
            size="lg"
            className="min-w-[200px] min-h-[48px] sm:min-h-0"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {progress || "Analyzing..."}
              </>
            ) : !analysisCheck.allowed ? (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Upgrade to Continue
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze (Personalized)
              </>
            )}
          </Button>

          {analysisCheck.allowed && !isAnalyzing && (
            <Button
              type="button"
              variant="outline"
              disabled={isAnalyzing}
              onClick={handleQuickImport}
              size="lg"
              className="min-w-[150px] min-h-[48px] sm:min-h-0"
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
