import { Crown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHapticFeedback } from '@/lib/capacitor';

interface UpgradePillProps {
  message: string;
  /** Short CTA label on the trailing chip. */
  actionLabel?: string;
  onUpgrade: () => void;
  className?: string;
}

/**
 * Inline upgrade nudge for quota banners and gated rows: one tappable pill
 * with a wiggling crown and an animated gradient hairline, quieter than the
 * full UpgradePrompt card but still unmistakably "there's more here".
 */
export function UpgradePill({ message, actionLabel = 'Upgrade', onUpgrade, className }: UpgradePillProps) {
  return (
    <div className={cn('upgrade-border rounded-full p-px', className)}>
      <button
        type="button"
        onClick={() => {
          triggerHapticFeedback('light');
          onUpgrade();
        }}
        className="pressable flex w-full items-center gap-2.5 rounded-full bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-amber-500/5"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
          <Crown className="crown-wiggle h-3.5 w-3.5 text-amber-500" />
        </span>
        <span className="min-w-0 flex-1 text-footnote leading-snug text-foreground-secondary">{message}</span>
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-caption-1 font-semibold text-amber-600 dark:text-amber-400">
          {actionLabel}
          <ChevronRight className="h-3 w-3" />
        </span>
      </button>
    </div>
  );
}
