import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PricingPlans } from './PricingPlans';
import { UsageDisplay } from './UsageDisplay';
import { Crown, RotateCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isNativeWrapper } from '@/lib/appMode';
import { triggerHapticFeedback } from '@/lib/capacitor';

interface SubscriptionModalProps {
  trigger?: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SubscriptionModal({
  trigger,
  defaultOpen = false,
  onOpenChange,
}: SubscriptionModalProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [restoring, setRestoring] = useState(false);
  const {
    restorePurchases,
    isNative,
    subscription,
    presentPaywallAlways,
    presentCustomerCenter,
  } = useSubscription();
  const { toast } = useToast();
  const nativeShell = isNativeWrapper();

  const openNativeBilling = async () => {
    triggerHapticFeedback("light");
    const paid = subscription?.tier && subscription.tier !== "free";
    if (paid) await presentCustomerCenter();
    else await presentPaywallAlways();
  };

  useEffect(() => {
    if (nativeShell && defaultOpen) {
      void openNativeBilling();
      onOpenChange?.(false);
    }
    // Present once when a native caller asks to open immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeShell, defaultOpen]);

  const handleOpenChange = (isOpen: boolean) => {
    if (nativeShell && isOpen) {
      void openNativeBilling();
      onOpenChange?.(false);
      return;
    }
    setOpen(isOpen);
    onOpenChange?.(isOpen);
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        triggerHapticFeedback("success");
        toast({
          title: 'Purchases restored',
          description: 'Your subscription has been restored successfully.',
        });
      }
    } catch (error) {
      toast({
        title: 'Restore failed',
        description: 'Could not restore purchases. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
    }
  };

  if (nativeShell) {
    if (!trigger) return null;
    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      void openNativeBilling();
    };
    return (
      <span onClick={onClick} role="presentation">
        {trigger}
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Subscription
          </DialogTitle>
          <DialogDescription>
            Manage your subscription and view usage
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="usage" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="usage">Current Usage</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="mt-4">
            <UsageDisplay showUpgrade />
          </TabsContent>

          <TabsContent value="plans" className="mt-4">
            <PricingPlans />

            {isNative && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={handleRestore}
                  disabled={restoring}
                >
                  {restoring ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Restore Purchases
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Already subscribed? Restore your previous purchase.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
