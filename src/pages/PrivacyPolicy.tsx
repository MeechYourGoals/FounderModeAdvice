import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
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

        <h1 className="text-4xl font-bold tracking-tight mb-8">Privacy Policy</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground italic">
            Last Updated: {new Date().toLocaleDateString()}
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Who We Are</h2>
            <p>
              Founder Mode Advice is operated by <strong>Saint Marlo Labs LLC</strong> ("Saint
              Marlo Labs", "we", "us", "our"), a Delaware limited liability company. Saint Marlo
              Labs LLC is the <strong>data controller</strong> responsible for the personal data
              processed through the service. You can reach us at{" "}
              <a
                href="mailto:CA@saintmarlolabs.com"
                className="underline hover:text-primary"
              >
                CA@saintmarlolabs.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. The Data We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account data</strong> — email address and, if you sign in with a third-
                party provider, basic profile information shared by that provider (such as name
                and email).
              </li>
              <li>
                <strong>Technical data</strong> — IP address, login data, browser type and
                version, time zone, operating system, and device identifiers.
              </li>
              <li>
                <strong>Usage data</strong> — interactions with the service, feature usage, and
                diagnostic events.
              </li>
              <li>
                <strong>Advisory content</strong> — the video links you submit, your startup
                profiles, uploaded decks, chat prompts, and the AI-generated advice and notes you
                save.
              </li>
              <li>
                <strong>Transaction data</strong> — limited billing metadata (subscription
                status, plan, country, last 4 of card) returned to us by our payment processor.
                Full payment details (card numbers, bank information) are collected and stored by
                our payment provider, not by us.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How &amp; Why We Use Your Data (Legal Bases)</h2>
            <p>
              We process personal data on the following legal bases (GDPR Article 6 / UK GDPR):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Performance of a contract</strong> — to create and manage your account,
                provide the service, deliver your subscription, and respond to support requests.
              </li>
              <li>
                <strong>Legitimate interests</strong> — to secure the service, prevent fraud and
                abuse, debug issues, analyze aggregate usage, and improve the product. We balance
                these interests against your privacy rights.
              </li>
              <li>
                <strong>Consent</strong> — for optional push notifications and any non-essential
                analytics or marketing communications. You can withdraw consent at any time.
              </li>
              <li>
                <strong>Legal obligation</strong> — to comply with tax, accounting, and other
                legal requirements.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Sign-In Providers</h2>
            <p>
              We offer sign-in through third-party OAuth providers (such as Google). The provider
              authenticates you and shares a limited set of profile information with us. We do
              not receive your password. Your use of the provider is also governed by that
              provider's privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Cookies &amp; Local Storage</h2>
            <p>
              We use browser local storage and similar technologies to keep you signed in and
              remember basic preferences. See our{" "}
              <a href="/cookies" className="underline hover:text-primary">
                Cookie Policy
              </a>{" "}
              for details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Who We Share Data With</h2>
            <p>
              We share personal data only with the categories of recipients listed below, and
              only to the extent needed for them to perform their role:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Paddle.com Market Limited</strong> — our <strong>Merchant of Record</strong>
                and payment provider. Paddle processes payments, calculates and remits sales
                tax/VAT, manages subscriptions, handles refunds and chargebacks, and issues
                invoices. When you check out, Paddle collects your billing details directly and
                acts as a separate data controller for that transaction. See{" "}
                <a
                  href="https://www.paddle.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary"
                >
                  Paddle's privacy policy
                </a>
                .
              </li>
              <li>
                <strong>Supabase</strong> — authentication, database, and backend hosting for
                your account and application data (bookmarks, profiles, analyses, chat history,
                uploaded decks).
              </li>
              <li>
                <strong>RevenueCat</strong> — manages mobile in-app subscription entitlements
                (Apple / Google) where applicable.
              </li>
              <li>
                <strong>AI processing providers</strong> — video links, transcripts where
                available, startup profile context, deck summaries, and chat prompts are sent to
                our AI gateway to generate the advice you request.
              </li>
              <li>
                <strong>OneSignal</strong> — if you opt in to push notifications, processes
                notification tokens and delivery metadata.
              </li>
              <li>
                <strong>Professional advisers and authorities</strong> — legal, accounting, and
                regulatory recipients where required by law.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. International Transfers</h2>
            <p>
              Our service providers may process data in the United States and other jurisdictions
              outside your home country. Where required, we rely on appropriate safeguards such
              as Standard Contractual Clauses or equivalent transfer mechanisms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account &amp; advisory content</strong> — retained for as long as your
                account is active. If you delete your account, this data is deleted within 30
                days, except where we are required to retain it for legal reasons.
              </li>
              <li>
                <strong>Billing &amp; tax records</strong> — retained by Paddle and by us as
                required by applicable tax and accounting law (typically 7 years).
              </li>
              <li>
                <strong>Security logs &amp; diagnostics</strong> — retained for up to 12 months.
              </li>
              <li>
                <strong>Backups</strong> — purged on a rolling basis, typically within 90 days.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Data Security</h2>
            <p>
              We use appropriate technical and organizational measures — including encryption in
              transit, access controls, and row-level security on our database — to protect your
              personal data against accidental loss and unauthorized access, alteration, or
              disclosure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. AI &amp; Advisory Interactions</h2>
            <p>
              Founder Mode Advice uses AI to analyze the videos and context you provide and
              generate advice tailored to your situation. AI-generated advice is informational
              only and is not professional, legal, financial, or investment advice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Your Rights</h2>
            <p>
              Depending on where you live, you may have the right to access, correct, delete,
              restrict, or port your personal data, to object to processing based on legitimate
              interests, and to withdraw consent. You can delete your account and all associated
              data at any time through Account settings or via our{" "}
              <a href="/account-deletion" className="underline hover:text-primary">
                Account Deletion
              </a>{" "}
              page. EU/UK residents also have the right to lodge a complaint with their local
              data protection authority. To exercise any right, contact{" "}
              <a
                href="mailto:CA@saintmarlolabs.com"
                className="underline hover:text-primary"
              >
                CA@saintmarlolabs.com
              </a>{" "}
              and we will respond within one month.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
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

export default PrivacyPolicy;
