import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-y-auto bg-background p-6 md:p-12" style={{ paddingTop: 'calc(1.5rem + var(--safe-area-top))', paddingBottom: 'calc(1.5rem + var(--safe-area-bottom))' }}>
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground italic">Last Updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing or using Founder Mode Advice, you agree to be bound by these Terms of Service.
              If you disagree with any part of the terms, then you may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Subscriptions</h2>
            <p>
              Some parts of the Service are billed on a subscription basis. You will be billed in advance on a
              recurring and periodic basis. Billing cycles are set on a monthly basis.
            </p>
            <p>
              At the end of each Billing Cycle, your Subscription will automatically renew under the exact same
              conditions unless you cancel it or Founder Mode Advice cancels it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Content &amp; AI-Generated Advice</h2>
            <p>
              Our Service allows you to submit videos from across the web and uses AI to generate advice and
              insights tailored to the context you provide. You are responsible for ensuring you have the right
              to submit any link or content, and for how you use the output.
            </p>
            <p>
              AI-generated advice is provided for informational purposes only. It may be inaccurate, incomplete,
              or not applicable to your specific circumstances, and it does not constitute professional, legal,
              financial, or investment advice. You are solely responsible for any decisions you make based on it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Accounts</h2>
            <p>
              When you create an account with us, you must provide information that is accurate, complete,
              and current at all times. Failure to do so constitutes a breach of the Terms, which may result
              in immediate termination of your account on our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are and will remain the
              exclusive property of Founder Mode Advice and its licensors.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
            <p>
              In no event shall Founder Mode Advice, nor its directors, employees, partners, agents, suppliers, or
              affiliates, be liable for any indirect, incidental, special, consequential or punitive damages,
              including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any
              reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Changes</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
              What constitutes a material change will be determined at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:CA@saintmarlolabs.com" className="underline hover:text-primary">CA@saintmarlolabs.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
