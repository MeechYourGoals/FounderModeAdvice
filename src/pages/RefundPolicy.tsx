import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RefundPolicy = () => {
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
          <p className="text-muted-foreground italic">
            Last Updated: {new Date().toLocaleDateString()}
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. 30-Day Money-Back Guarantee</h2>
            <p>
              Saint Marlo Labs LLC ("we", "us") offers a 30-day money-back guarantee on all
              subscriptions to Founder Mode Advice. If you are not satisfied with your purchase,
              you may request a full refund within 30 days of the original order date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How to Request a Refund</h2>
            <p>
              Our order process is conducted by our online reseller Paddle.com. Paddle is the
              Merchant of Record for all our orders and handles all refunds.
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
              You can cancel your subscription at any time from your account settings or via the
              customer portal provided by Paddle. Cancellation stops future renewals; access to
              paid features continues until the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Contact</h2>
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
