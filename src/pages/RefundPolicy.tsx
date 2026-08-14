import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";

const RefundPolicy = () => {
  usePageMeta({ title: "Refund Policy", description: "Billing, renewals, and refunds for Founder Mode Advice subscriptions.", path: "/refund-policy" });

  const navigate = useNavigate();

  return (
    <div
      className="h-screen overflow-y-auto bg-background p-6 md:p-12 pb-nav"
      style={{ paddingTop: "calc(1.5rem + var(--safe-area-top))" }}
    >
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-4xl font-bold tracking-tight mb-8">Refund Policy</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground italic">Last Updated: August 14, 2026</p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. 30-Day Money-Back Guarantee (Web Purchases)</h2>
            <p>
              Saint Marlo Labs LLC ("we", "us") offers a 30-day money-back guarantee on
              subscriptions purchased on our website. If you are not satisfied with your
              purchase, you may request a full refund within 30 days of the original order
              date. Purchases made inside the iOS or Android app are billed by Apple or
              Google and follow their refund process instead — see Section 5.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How to Request a Refund (Web Purchases)</h2>
            <p>
              Our web order process is conducted by our online reseller Paddle.com. Paddle is
              the Merchant of Record for our web orders and handles those refunds.
            </p>
            <p>
              To request a refund, visit{" "}
              <a
                href="https://paddle.net"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                paddle.net
              </a>{" "}
              and look up your order using the email address you used at checkout, or contact us
              at{" "}
              <a
                href="mailto:CA@saintmarlolabs.com"
                className="underline hover:text-primary"
              >
                CA@saintmarlolabs.com
              </a>{" "}
              and we will help you through the process.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Processing</h2>
            <p>
              Approved refunds are returned to the original payment method. Processing typically
              takes 5–10 business days depending on your bank or card issuer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Cancellations</h2>
            <p>
              You can cancel your subscription at any time from your account settings (web:
              Paddle customer portal; iOS/Android: Manage Subscription, which opens your App
              Store or Google Play subscription settings). Cancellation stops future
              renewals; access to paid features continues until the end of the current
              billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Purchases Made Through Apple or Google</h2>
            <p>
              If you subscribed inside our iOS app, your purchase is processed by Apple, and
              refunds are granted at Apple's discretion under Apple's terms — request one at{" "}
              <a
                href="https://reportaproblem.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                reportaproblem.apple.com
              </a>
              . If you subscribed inside our Android app, refunds follow Google Play's
              policy. We cannot issue refunds for purchases billed by Apple or Google, but
              contact us and we'll help however we can.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Contact</h2>
            <p>
              Questions about this policy?{" "}
              <a
                href="mailto:CA@saintmarlolabs.com"
                className="underline hover:text-primary"
              >
                CA@saintmarlolabs.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
