import { ExternalLink, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useInspirations } from "@/hooks/useInspirations";
import { findInspirationOption, youtubeSearchUrl } from "@/lib/inspirations";
import { triggerHapticFeedback } from "@/lib/capacitor";

/**
 * Personalized follow-up to the onboarding "who inspires you?" question: one
 * tap opens a YouTube search for that person (a search, not a specific video,
 * so nothing rots), and the user pastes whichever talk they pick back into the
 * analyze box. Renders nothing until the user has made picks.
 */
export const InspirationRecommendations = () => {
  const { inspirations, loading } = useInspirations();

  if (loading || inspirations.length === 0) return null;

  const openSearch = (name: string) => {
    triggerHapticFeedback("light");
    window.open(youtubeSearchUrl(name), "_blank");
  };

  return (
    <div className="space-y-4">
      <Separator className="opacity-60" />

      <div className="space-y-1">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <h4 className="text-headline tracking-tight">Picked for you</h4>
        <p className="text-footnote text-foreground-tertiary max-w-md mx-auto">
          Based on who inspires you. Open a search, pick a talk or interview, then paste the
          link above to turn it into a memo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
        {inspirations.map((name) => {
          const known = findInspirationOption(name);
          return (
            <button
              key={name}
              onClick={() => openSearch(name)}
              className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md active:scale-[0.99]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ExternalLink className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-subhead leading-snug truncate">{name}</span>
                <span className="block text-caption-1 text-foreground-tertiary truncate">
                  {known ? `${known.knownFor} · Search on YouTube` : "Search on YouTube"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
