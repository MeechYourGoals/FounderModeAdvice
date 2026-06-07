import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, RotateCcw, Users, Bookmark, Video } from "lucide-react";
import { TIER_PRICING, isUnlimited } from "@/types/subscription";
import { triggerHapticFeedback } from "@/lib/capacitor";

/**
 * Subscription home for Settings → Subscription.
 *
 * Shows the current plan name, price, usage/limits, and the Manage Subscription
 * CTA (Stripe Customer Portal on web, RevenueCat Customer Center on native).
 * This is the single, canonical place for plan/billing UI — it is intentionally
 * NOT rendered inside the Business Profiles or Bookmarks surfaces.
 */
export function SubscriptionSettingsCard() {
  const { subscription, loading, manageSubscription, isNative, restorePurchases } = useSubscription();
  const navigate = useNavigate();

  if (loading || !subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-9 w-full rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { tier, limits } = subscription;
  const tierInfo = TIER_PRICING[tier];
  const isFree = tier === "free";

  const usageItems = [
    { label: "Profiles", icon: Users, used: limits.profiles.used, max: limits.profiles.max },
    { label: "Bookmarks", icon: Bookmark, used: limits.bookmarks.used, max: limits.bookmarks.max },
    { label: "Analyses this month", icon: Video, used: limits.analyses.used, max: limits.analyses.max },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Subscription
        </CardTitle>
        <CardDescription>
          {isFree ? "You're on the Free plan." : "Manage or cancel your plan anytime."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current plan + price */}
        <div className="flex flex-wrap items-center justify-between gap-y-1">
          <div className="space-y-0.5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{tierInfo.displayName}</span>
              {!isFree && <Badge variant="secondary">Active</Badge>}
            </div>
          </div>
          <p className="text-lg font-semibold text-primary">
            {isFree ? "Free" : tierInfo.priceDisplay}
          </p>
        </div>

        {/* Manage / upgrade CTA — full width on mobile, auto on larger screens */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {isFree ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                triggerHapticFeedback("light");
                navigate("/account");
              }}
            >
              View plans
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                triggerHapticFeedback("light");
                manageSubscription();
              }}
            >
              Manage Subscription
            </Button>
          )}
          {isNative && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => restorePurchases()}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore Purchases
            </Button>
          )}
        </div>

        {/* Usage / limits */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Usage</p>
          {usageItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </span>
              <span className="font-medium tabular-nums">
                {isUnlimited(item.max) ? (
                  <span className="text-primary">Unlimited</span>
                ) : (
                  `${item.used} / ${item.max}`
                )}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
