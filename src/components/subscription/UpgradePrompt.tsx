import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, ArrowRight } from 'lucide-react';
import { TIER_PRICING } from '@/types/subscription';

interface UpgradePromptProps {
  message: string;
  feature?: 'profile' | 'bookmark' | 'analysis' | 'videoChat' | 'export' | 'sharing';
  onUpgrade?: () => void;
  compact?: boolean;
}

export function UpgradePrompt({ message, feature, onUpgrade, compact = false }: UpgradePromptProps) {
  const { upgradeTo } = useSubscription();

  // Ask-the-video chat and export are Boardroom-only; everything else upgrades to The C-Suite first.
  const targetTier: 'seed' | 'series_z' =
    feature === 'videoChat' || feature === 'export' ? 'series_z' : 'seed';

  const handleUpgrade = async () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      await upgradeTo(targetTier);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-700 dark:text-amber-300">{message}</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleUpgrade} className="shrink-0">
          Upgrade
        </Button>
      </div>
    );
  }

  const planTier = TIER_PRICING[targetTier];

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-amber-500/10">
            <Crown className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Upgrade Required</CardTitle>
            <CardDescription>{message}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-background/50 rounded-lg border">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">{planTier.displayName}</span>
            <span className="text-lg font-bold">{planTier.priceDisplay}</span>
          </div>
          <ul className="space-y-1">
            {planTier.features.slice(0, 3).map((feature, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <Button onClick={handleUpgrade} className="w-full">
          Upgrade to {planTier.displayName}
        </Button>
      </CardContent>
    </Card>
  );
}
