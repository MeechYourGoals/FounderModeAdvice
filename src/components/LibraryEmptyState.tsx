import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Play, ArrowUp } from "lucide-react";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { STARTER_VIDEOS } from "@/lib/starterVideos";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { HighlightedFounders } from "@/components/HighlightedFounders";

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
    // Bring the analyzing scene into view — the empty state sits below the
    // form, so without this the progress plays off-screen.
    window.dispatchEvent(new Event("openAnalyze"));
  };

  return (
    <Card className="p-6 sm:p-10 text-center space-y-6">
      <div>
        <div className="relative mx-auto mb-4 w-fit">
          <div aria-hidden className="absolute -inset-3 rounded-full bg-primary/15 blur-xl" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.2)]">
            <Play className="h-6 w-6" />
          </div>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold tracking-tight">
          Analyze your{" "}
          <span className="font-display font-medium italic text-gradient">first video</span>
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
          Paste a founder, operator, or investor video above — or start with one of these.
          {activeProfile
            ? <> The memo will be tailored to <span className="font-medium text-foreground">{activeProfile.company_name}</span>.</>
            : <> Add a company profile to tailor the advice to your stage and industry.</>}
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
            className="group flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md active:scale-[0.99]"
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

      {/* "Who do I look up?" inspiration — founders to search on YouTube */}
      <HighlightedFounders />
    </Card>
  );
};
