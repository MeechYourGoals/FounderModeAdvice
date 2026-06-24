import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
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

        <h1 className="text-4xl font-bold tracking-tight mb-8">Terms of Service</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground italic">
            Last Updated: {new Date().toLocaleDateString()}
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Who We Are &amp; Agreement to Terms</h2>
            <p>
              Founder Mode Advice is operated by <strong>Saint Marlo Labs LLC</strong> ("Saint
              Marlo Labs", "we", "us", "our"), the legal entity providing the service. By
              accessing or using Founder Mode Advice, you agree to be bound by these Terms of
              Service. If you disagree with any part of the terms, you may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Accounts</h2>
            <p>
              When you create an account, you must provide accurate, complete, and current
              information and keep your credentials confidential. You are responsible for all
              activity under your account. You must be of legal age in your jurisdiction to use
              the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Acceptable Use</h2>
            <p>You agree not to misuse the service. You must not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service for any unlawful, fraudulent, or deceptive purpose.</li>
              <li>Send spam, harass others, or transmit malware or malicious code.</li>
              <li>
                Submit content you do not have the right to submit, or content that infringes
                intellectual property, privacy, or other rights of others.
              </li>
              <li>
                Probe, scan, scrape, reverse engineer, or interfere with the security or
                integrity of the service, or attempt to circumvent rate limits or technical
                restrictions.
              </li>
              <li>
                Resell, redistribute, or sublicense the service without our prior written
                consent.
              </li>
              <li>
                Use the service to generate content that is illegal, defamatory, hateful, or
                designed to harm others.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Payments &amp; Subscriptions</h2>
            <p>
              Our order process is conducted by our online reseller{" "}
              <strong>Paddle.com</strong>. Paddle.com is the Merchant of Record for all our
              orders. Paddle provides all customer service inquiries and handles returns. By
              purchasing a subscription, you also agree to Paddle's{" "}
              <a
                href="https://www.paddle.com/legal/checkout-buyer-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                Checkout Buyer Terms
              </a>
              , which govern payment, billing, tax, cancellation, and refund mechanics.
            </p>
            <p>
              Subscriptions are billed in advance on a recurring basis (typically monthly or
              annually depending on the plan you select) and renew automatically until cancelled.
              You can cancel at any time from your account; cancellation takes effect at the end
              of the current billing period. Refunds are handled according to our{" "}
              <a href="/refund-policy" className="underline hover:text-primary">
                Refund Policy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Content &amp; AI-Generated Advice</h2>
            <p>
              Our service allows you to submit videos and other context, and uses AI to generate
              advice and insights. You are responsible for ensuring you have the right to submit
              any link or content, and for how you use the output. We grant you a limited,
              non-exclusive, non-transferable right to use the service and its output within your
              plan.
            </p>
            <p>
              AI-generated advice is provided for informational purposes only. It may be
              inaccurate, incomplete, or not applicable to your situation, and it does not
              constitute professional, legal, financial, investment, tax, or medical advice. You
              are solely responsible for any decisions you make based on it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            <p>
              The service and its original content, features, and functionality are and will
              remain the exclusive property of Saint Marlo Labs LLC and its licensors. You retain
              ownership of the content you submit, but grant us a limited license to host,
              process, and use it solely to operate and improve the service for you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Service Availability &amp; Warranties</h2>
            <p>
              We do not guarantee that the service will be uninterrupted, error-free, or always
              available. To the fullest extent permitted by law, the service is provided "as is"
              and we disclaim all implied warranties, including merchantability and fitness for a
              particular purpose.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Saint Marlo Labs LLC and its directors,
              employees, partners, agents, suppliers, and affiliates will not be liable for any
              indirect, incidental, special, consequential, or punitive damages, including loss
              of profits, data, use, or goodwill. Our aggregate liability for any claim relating
              to the service is limited to the fees you paid us in the 12 months preceding the
              claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Suspension &amp; Termination</h2>
            <p>
              We may suspend or terminate your access immediately, without prior notice, for
              material breach of these Terms, non-payment, security or fraud risk, or repeated
              violations of acceptable use. You may stop using the service at any time. On
              termination, your right to use the service ends; we may delete associated data
              after a reasonable export window.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes</h2>
            <p>
              We may modify these Terms from time to time. Material changes will be communicated
              through the service or by email. Continued use after changes take effect
              constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact</h2>
            <p>
              Saint Marlo Labs LLC —{" "}
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

export default TermsOfService;
