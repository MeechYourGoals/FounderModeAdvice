import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Check, Sparkles } from 'lucide-react';
import { TIER_PRICING, tierPriceLabel } from '@/types/subscription';
import { UpgradePill } from '@/components/subscription/UpgradePill';

interface UpgradePromptProps {
  message: string;
  feature?: 'profile' | 'bookmark' | 'analysis' | 'videoChat' | 'export' | 'sharing' | 'upload' | 'discovery' | 'autoFolder';
  onUpgrade?: () => void;
  compact?: boolean;
}

export function UpgradePrompt({ message, feature, onUpgrade, compact = false }: UpgradePromptProps) {
  const { upgradeTo, isNative } = useSubscription();

  // Ask-the-video chat, export, sharing/collaboration, and personalized
  // discovery are Boardroom-only (enforced server-side via
  // user_has_boardroom_plan); everything else upgrades to The C-Suite first.
  const targetTier: 'seed' | 'series_z' =
    feature === 'videoChat' || feature === 'export' || feature === 'sharing' || feature === 'discovery' || feature === 'autoFolder'
      ? 'series_z'
      : 'seed';

  const handleUpgrade = async () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      await upgradeTo(targetTier);
    }
  };

  if (compact) {
    return <UpgradePill message={message} onUpgrade={handleUpgrade} />;
  }

  const planTier = TIER_PRICING[targetTier];

  return (
    <div className="upgrade-border rounded-2xl p-px animate-scale-in">
      <Card className="relative overflow-hidden rounded-[calc(1rem-1px)] border-0 bg-gradient-to-br from-amber-500/[0.07] via-card to-orange-500/[0.05]">
        {/* Soft ambient glow behind the crown */}
        <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div aria-hidden className="absolute -inset-1.5 rounded-full bg-amber-500/15 blur-md" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                <Crown className="crown-wiggle h-5 w-5 text-amber-500" />
              </div>
            </div>
            <div>
              <CardTitle className="text-lg">Unlock more</CardTitle>
              <CardDescription>{message}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/50 p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                {planTier.displayName}
              </span>
              <span className={isNative ? 'text-sm font-medium text-muted-foreground' : 'text-lg font-bold'}>
                {tierPriceLabel(targetTier, { native: isNative })}
              </span>
            </div>
            <ul className="space-y-1.5">
              {planTier.features.slice(0, 3).map((feature, i) => (
                <li
                  key={i}
                  style={{ '--stagger-i': i } as React.CSSProperties}
                  className="stagger-rise flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/15">
                    <Check className="h-2.5 w-2.5 text-success" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <Button
            onClick={handleUpgrade}
            className="cta-shimmer relative w-full overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-500/90 hover:to-orange-500/90"
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to {planTier.displayName}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
