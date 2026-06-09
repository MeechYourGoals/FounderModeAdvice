import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Play, ArrowUp } from "lucide-react";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { STARTER_VIDEOS } from "@/lib/starterVideos";
import { triggerHapticFeedback } from "@/lib/capacitor";

/**
 * First-run activation state for the analyzed-videos library. Nudges the user to
 * create a business profile (so analyses are personalized) and offers one-tap
 * starter videos that kick off their first analysis.
 */
export const LibraryEmptyState = () => {
  const { activeProfile, profiles } = useActiveProfile();

  const analyzeStarter = (url: string) => {
    triggerHapticFeedback("medium");
    window.dispatchEvent(new CustomEvent("analyzeUrl", { detail: { url } }));
  };

  return (
    <Card className="p-6 sm:p-10 text-center space-y-6">
      <div>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Play className="h-6 w-6" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold">Analyze your first video</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
          Paste any business, founder, or leadership video above — or start with one of these.
          {activeProfile
            ? <> Insights will be tailored to <span className="font-medium text-foreground">{activeProfile.company_name}</span>.</>
            : <> Add a business profile to personalize the advice.</>}
        </p>
      </div>

      {/* Profile nudge when the user has none */}
      {profiles.length === 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new Event("openProfiles"))}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Create your first business profile
          </Button>
          <span className="text-xs text-muted-foreground hidden sm:inline">·</span>
          <button
            className="text-xs text-muted-foreground underline hover:text-primary inline-flex items-center gap-1"
            onClick={() => window.dispatchEvent(new Event("openAnalyze"))}
          >
            <ArrowUp className="h-3 w-3" /> or paste a URL above
          </button>
        </div>
      )}

      {/* Starter videos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
        {STARTER_VIDEOS.map((video) => (
          <button
            key={video.url}
            onClick={() => analyzeStarter(video.url)}
            className="group flex items-start gap-3 rounded-xl border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Play className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-snug">{video.title}</span>
              <span className="block text-xs text-muted-foreground truncate">{video.source}</span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
};
