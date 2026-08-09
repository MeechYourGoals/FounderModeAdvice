import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Star, ArrowUp } from 'lucide-react';
import { TIER_PRICING, type SubscriptionTier, type TierPricing } from '@/types/subscription';
import { cn } from '@/lib/utils';

interface PricingPlansProps {
  onSelect?: (tier: SubscriptionTier) => void;
  showCurrentPlan?: boolean;
}

export function PricingPlans({ onSelect, showCurrentPlan = true }: PricingPlansProps) {
  const { subscription, upgradeTo, loading, isNative } = useSubscription();

  const tiers = Object.entries(TIER_PRICING) as [SubscriptionTier, TierPricing][];

  const handleSelect = async (tier: SubscriptionTier) => {
    if (onSelect) {
      onSelect(tier);
    } else {
      await upgradeTo(tier);
    }
  };

  const getTierIcon = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'free':
        return <Star className="h-5 w-5" />;
      case 'seed':
        return <ArrowUp className="h-5 w-5" />;
      case 'series_z':
        return <Crown className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map(([tierKey, tier]) => {
          const isCurrentPlan = subscription?.tier === tierKey;
          const isUpgrade = subscription?.tier === 'free' ||
            (subscription?.tier === 'seed' && tierKey === 'series_z');
          const { price, suffix } = tierKey === 'free'
            ? { price: 'Free', suffix: '' }
            : isNative
              ? { price: 'View App Store price', suffix: '' }
            : { price: `$${tier.price}`, suffix: '/month' };

          return (
            <Card
              key={tierKey}
              className={cn(
                'relative flex flex-col transition-all',
                tier.recommended && 'glass border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_20px_50px_-16px_hsl(var(--primary)/0.35)]',
                isCurrentPlan && showCurrentPlan && 'ring-2 ring-primary'
              )}
            >
              {tier.recommended && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}

              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'p-2 rounded-full',
                    tierKey === 'free' && 'bg-muted',
                    tierKey === 'seed' && 'bg-amber-500/10 text-amber-500',
                    tierKey === 'series_z' && 'bg-purple-500/10 text-purple-500'
                  )}>
                    {getTierIcon(tierKey)}
                  </div>
                  <CardTitle>{tier.displayName}</CardTitle>
                </div>
                <CardDescription className="pt-2">
                  <span className="text-2xl font-bold text-foreground">
                    {price}
                  </span>
                  {suffix && (
                    <span className="text-sm text-muted-foreground">{suffix}</span>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrentPlan && showCurrentPlan ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : tierKey === 'free' ? (
                  <Button variant="outline" className="w-full" disabled>
                    Free plan
                  </Button>
                ) : (
                  <Button
                    className={cn(
                      'w-full',
                      tier.recommended && 'bg-primary'
                    )}
                    onClick={() => handleSelect(tierKey)}
                    disabled={loading || !isUpgrade}
                  >
                    {isUpgrade ? `Upgrade to ${tier.displayName}` : 'Downgrade'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
