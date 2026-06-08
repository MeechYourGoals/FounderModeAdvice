import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Bookmark, Video, Sparkles, Settings } from 'lucide-react';
import { TIER_PRICING } from '@/types/subscription';
import { cn } from '@/lib/utils';

interface UsageDisplayProps {
  showUpgrade?: boolean;
  compact?: boolean;
}

export function UsageDisplay({ showUpgrade = true, compact = false }: UsageDisplayProps) {
  const { subscription, loading, upgradeTo, manageSubscription } = useSubscription();

  if (loading || !subscription) {
    return (
      <Card className={cn(compact && 'border-0 shadow-none')}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { limits, tier } = subscription;
  const tierInfo = TIER_PRICING[tier];
  
  // Founder/super admin accounts have max >= 9999 — treat as unlimited
  const isUnlimited = (max: number) => max >= 9999;

  const usageItems = [
    {
      label: 'Profiles',
      icon: Users,
      used: limits.profiles.used,
      max: limits.profiles.max,
      color: 'bg-blue-500',
    },
    {
      label: 'Bookmarks',
      icon: Bookmark,
      used: limits.bookmarks.used,
      max: limits.bookmarks.max,
      color: 'bg-success',
    },
    {
      label: 'Analyses this month',
      icon: Video,
      used: limits.analyses.used,
      max: limits.analyses.max,
      color: 'bg-purple-500',
    },
  ];

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={tier === 'free' ? 'secondary' : 'default'}>
            {tierInfo.displayName}
          </Badge>
          {tier !== 'free' && (
            <Button variant="ghost" size="sm" onClick={manageSubscription}>
              <Settings className="h-4 w-4 mr-1" />
              Manage
            </Button>
          )}
        </div>
        {usageItems.map((item) => {
          const percentage = (item.used / item.max) * 100;
          const isNearLimit = percentage >= 80;
          const isAtLimit = item.used >= item.max;

          if (isUnlimited(item.max)) {
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <item.icon className="h-3 w-3" />
                    {item.label}
                  </span>
                  <span className="text-primary font-medium">Unlimited</span>
                </div>
              </div>
            );
          }

          return (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1">
                  <item.icon className="h-3 w-3" />
                  {item.label}
                </span>
                <span className={cn(
                  isAtLimit && 'text-destructive font-medium',
                  isNearLimit && !isAtLimit && 'text-amber-500'
                )}>
                  {item.used}/{item.max}
                </span>
              </div>
              <Progress
                value={percentage}
                className={cn(
                  'h-1.5',
                  isAtLimit && '[&>div]:bg-destructive',
                  isNearLimit && !isAtLimit && '[&>div]:bg-amber-500'
                )}
              />
            </div>
          );
        })}
        {showUpgrade && tier === 'free' && (
          <Button
            size="sm"
            className="w-full mt-2"
            onClick={() => upgradeTo('seed')}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Your Plan
              <Badge variant={tier === 'free' ? 'secondary' : 'default'}>
                {tierInfo.displayName}
              </Badge>
            </CardTitle>
            <CardDescription>
              {tier === 'free'
                ? 'Upgrade for more profiles, bookmarks, and analyses'
                : tierInfo.priceDisplay}
            </CardDescription>
          </div>
          {tier !== 'free' && (
            <Button variant="outline" size="sm" onClick={manageSubscription}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Subscription
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {usageItems.map((item) => {
          const percentage = (item.used / item.max) * 100;
          const isNearLimit = percentage >= 80;
          const isAtLimit = item.used >= item.max;

          if (isUnlimited(item.max)) {
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('p-1.5 rounded', item.color + '/10')}>
                      <item.icon className={cn('h-4 w-4', item.color.replace('bg-', 'text-'))} />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <span className="text-sm text-primary font-medium">Unlimited</span>
                </div>
              </div>
            );
          }

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('p-1.5 rounded', item.color + '/10')}>
                    <item.icon className={cn('h-4 w-4', item.color.replace('bg-', 'text-'))} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className={cn(
                  'text-sm',
                  isAtLimit && 'text-destructive font-medium',
                  isNearLimit && !isAtLimit && 'text-amber-500 font-medium'
                )}>
                  {item.used} of {item.max} used
                </span>
              </div>
              <Progress
                value={percentage}
                className={cn(
                  'h-2',
                  isAtLimit && '[&>div]:bg-destructive',
                  isNearLimit && !isAtLimit && '[&>div]:bg-amber-500'
                )}
              />
              {isAtLimit && (
                <p className="text-xs text-destructive">
                  Limit reached. Upgrade to continue.
                </p>
              )}
            </div>
          );
        })}

        {showUpgrade && tier !== 'series_z' && (
          <div className="pt-4 border-t">
            <Button
              className="w-full"
              onClick={() => upgradeTo(tier === 'free' ? 'seed' : 'series_z')}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade to {TIER_PRICING[tier === 'free' ? 'seed' : 'series_z'].displayName}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
