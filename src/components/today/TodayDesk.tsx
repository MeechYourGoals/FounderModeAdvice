import { useNavigate } from "react-router-dom";
import { ArrowRight, Compass, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradePrompt } from "@/components/subscription";
import { DiscoveryCard } from "@/components/discover/DiscoveryCard";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useOpenActionItems } from "@/hooks/useOpenActionItems";
import { useRecommendations } from "@/hooks/useRecommendations";
import { firstNameFromUser, timeOfDayGreeting } from "@/lib/companion";
import { todaysPrompt } from "@/lib/dailyPrompt";
import { hasDiscoveryAccess } from "@/lib/discovery";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { captureEvent } from "@/services/analytics";
import { logRecommendationEvent } from "@/services/discovery";

interface TodayDeskProps {
  onOpenEpisode: (episodeId: string) => void;
  onPrepareMemo: (url: string, recommendationId?: string | null) => void;
}

/**
 * The signed-in home desk: greeting, today's question, unfinished action
 * items, and a short cut of this week's briefing.
 */
export const TodayDesk = ({ onOpenEpisode, onPrepareMemo }: TodayDeskProps) => {
  const { user } = useAuth();
  const { activeProfile, activeProfileId, profiles } = useActiveProfile();
  const { subscription } = useSubscription();
  const navigate = useNavigate();

  const isPremium = hasDiscoveryAccess(subscription?.tier);
  const feedProfileId = activeProfileId ?? profiles[0]?.id ?? null;
  const { recommendations, loading: briefingLoading } = useRecommendations(isPremium ? feedProfileId : null);
  const { items: actionItems, loading: actionsLoading } = useOpenActionItems(activeProfileId);
  const briefingPicks = recommendations.slice(0, 3);

  const firstName = firstNameFromUser(user);
  const company = activeProfile?.company_name;
  const greeting = firstName ? `${timeOfDayGreeting()}, ${firstName}` : timeOfDayGreeting();

  const openBriefing = () => {
    triggerHapticFeedback("light");
    navigate("/discover");
  };

  return (
    <section className="space-y-5" aria-label="Today's desk">
      <header className="space-y-1.5">
        <p className="text-caption-1 font-medium uppercase tracking-wide text-primary">Today</p>
        <h1 className="text-title-1 sm:text-large-title">
          {greeting}
          {company ? (
            <>
              .{" "}
              <span className="font-display font-medium italic text-gradient">Working as {company}</span>
            </>
          ) : (
            <span className="text-muted-foreground font-display font-medium italic">.</span>
          )}
        </h1>
        {!company && (
          <p className="text-subhead text-muted-foreground">
            Universal lens —{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => window.dispatchEvent(new Event("openProfiles"))}
            >
              add a company
            </button>{" "}
            so every memo and briefing is written for you.
          </p>
        )}
      </header>

      <Card className="relative overflow-hidden p-4 sm:p-5 border-primary/15">
        <div aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "var(--gradient-primary)" }} />
        <p className="mb-1.5 text-caption-2 font-semibold uppercase tracking-wide text-primary">
          Today's focus
        </p>
        <p className="text-body-lg leading-relaxed text-foreground">{todaysPrompt()}</p>
      </Card>

      {(actionsLoading || actionItems.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <h2 className="text-title-3">Needs you</h2>
          </div>
          {actionsLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading action items">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : (
            <ul className="space-y-2">
              {actionItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback("light");
                      onOpenEpisode(item.episodeId);
                    }}
                    className="flex w-full items-start gap-3 rounded-2xl border border-border/70 bg-card p-3.5 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.03] min-h-[56px]"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-relaxed text-foreground">{item.text}</span>
                      <span className="mt-0.5 block truncate text-caption-1 text-muted-foreground">
                        From {item.episodeTitle}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <h2 className="text-title-3">This week's briefing</h2>
          </div>
          {isPremium && briefingPicks.length > 0 && (
            <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={openBriefing}>
              See the full briefing
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {!isPremium ? (
          <UpgradePrompt
            message="Your briefing unlocks on The Boardroom — a short weekly set chosen for what you're building."
            feature="discovery"
          />
        ) : briefingLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading this week's briefing">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : briefingPicks.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">
              I'm still gathering this week's set
              {company ? ` for ${company}` : ""}.{" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={openBriefing}
              >
                Open the briefing
              </button>
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {briefingPicks.map((recommendation, index) => (
              <DiscoveryCard
                key={recommendation.id}
                content={recommendation.content}
                reason={recommendation.reason}
                state={recommendation.state}
                variant={index === 0 ? "featured" : "compact"}
                onImpression={() => {
                  if (!user) return;
                  void logRecommendationEvent("impression", {
                    userId: user.id,
                    profileId: recommendation.profile_id,
                    recommendationId: recommendation.id,
                    contentId: recommendation.content.id,
                    surface: "for_you",
                    position: recommendation.position,
                    analytics: { content_type: recommendation.content.content_type, surface: "today_desk" },
                  });
                }}
                onAnalyze={() => {
                  captureEvent("discovery_analyze_clicked", { surface: "today_desk" });
                  if (recommendation.state === "analyzed" && recommendation.analyzed_episode_id) {
                    onOpenEpisode(recommendation.analyzed_episode_id);
                    return;
                  }
                  onPrepareMemo(
                    recommendation.content.canonical_url || recommendation.content.url,
                    recommendation.id,
                  );
                }}
                onOpenSource={() => {
                  window.open(
                    recommendation.content.canonical_url || recommendation.content.url,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
