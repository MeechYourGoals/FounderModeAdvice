import { useState } from "react";
import { ArrowRight, Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useChallenges } from "@/hooks/useChallenges";
import { challengeLabels } from "@/lib/challenges";
import { triggerHapticFeedback } from "@/lib/capacitor";

const dismissKey = (userId: string) => `fma_profile_nudge_dismissed_${userId}`;

/**
 * First-run nudge on the home desk: shown after onboarding while the user has
 * no business profile yet. Opens the Profiles panel; dismissal sticks per
 * user, and the card retires itself for good once a profile exists (the
 * caller gates on `profiles.length === 0`).
 */
export const ProfileNudgeCard = () => {
  const { user } = useAuth();
  const { challenges } = useChallenges();
  const [dismissed, setDismissed] = useState(() =>
    user ? localStorage.getItem(dismissKey(user.id)) === "true" : false,
  );

  if (!user || dismissed) return null;

  const focusLabels = challengeLabels(challenges);
  const focusLine =
    focusLabels.length > 0
      ? `You said you're focused on ${focusLabels.slice(0, 2).join(" and ")}${focusLabels.length > 2 ? " (and more)" : ""} — `
      : "";

  const dismiss = () => {
    triggerHapticFeedback("light");
    localStorage.setItem(dismissKey(user.id), "true");
    setDismissed(true);
  };

  return (
    <div className="nudge-border animate-scale-in rounded-2xl p-px">
      <div className="relative overflow-hidden rounded-[calc(1rem-1px)] bg-gradient-to-br from-primary/[0.07] via-card to-card p-4">
        <div aria-hidden className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-foreground-quaternary transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3.5 pr-8">
          <span className="animate-float-soft mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-callout font-semibold">Finish your profile</p>
            <p className="mt-1 text-footnote leading-relaxed text-foreground-secondary">
              {focusLine}memos and briefings get dramatically sharper once we know your company.
            </p>
            <Button
              size="sm"
              className="cta-shimmer relative mt-3 overflow-hidden rounded-full"
              onClick={() => {
                triggerHapticFeedback("light");
                window.dispatchEvent(new Event("openProfiles"));
              }}
            >
              Complete your profile
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
