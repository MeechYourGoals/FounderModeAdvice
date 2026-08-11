import { Link } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';

/**
 * Compact subscription terms shown wherever plans are offered. Covers the
 * App Store disclosure requirements (billing period, auto-renewal, exact
 * price source, cancellation path, restore, legal links) and the Paddle
 * equivalent on the web.
 */
export function SubscriptionDisclosure() {
  const { isNative } = useSubscription();

  return (
    <div className="mt-6 space-y-2 text-xs text-muted-foreground">
      <p>
        {isNative ? (
          <>
            Paid plans are auto-renewing monthly subscriptions. Payment is charged to your
            Apple Account (or Google Play account) when you confirm the purchase, and the
            exact localized price is always shown on the checkout screen before you pay.
            Your subscription renews automatically each month at that price unless you
            cancel at least 24 hours before the end of the current period. Manage or cancel
            anytime via Manage Subscription in your Account settings, or in your device's
            subscription settings. Already subscribed on another device? Use Restore
            Purchases.
          </>
        ) : (
          <>
            Paid plans are auto-renewing monthly subscriptions billed at the price shown by
            our merchant of record, Paddle. Your subscription renews automatically each
            month until canceled. Cancel anytime from Account → Manage Subscription; you
            keep access until the end of the paid period.
          </>
        )}
      </p>
      <p className="space-x-3">
        <Link to="/privacy-policy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        <Link to="/terms-of-service" className="underline hover:text-foreground">
          Terms of Use
        </Link>
        {!isNative && (
          <Link to="/refund-policy" className="underline hover:text-foreground">
            Refund Policy
          </Link>
        )}
      </p>
    </div>
  );
}
