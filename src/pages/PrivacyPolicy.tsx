import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-y-auto bg-background p-6 md:p-12 pb-nav" style={{ paddingTop: 'calc(1.5rem + var(--safe-area-top))' }}>
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-4xl font-bold tracking-tight mb-8">Privacy Policy</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground italic">Last Updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              Welcome to Founder Mode Advice. We respect your privacy and are committed to protecting your personal data.
              This privacy policy will inform you about how we look after your personal data when you use our
              application and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. The Data We Collect</h2>
            <p>
              We may collect, use, store and transfer different kinds of personal data about you which we have
              grouped together as follows:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data</strong> includes your email address and, if you sign in with a third-party provider, the basic profile information that provider shares (such as name and email).</li>
              <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, operating system and platform, and other technology on the devices you use to access this app.</li>
              <li><strong>Usage Data</strong> includes information about how you use our app.</li>
              <li><strong>Advisory Content</strong> includes the video links you submit, your startup profiles, and the AI-generated advice and notes you save within the app.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2a. Sign-In Providers</h2>
            <p>
              We offer sign-in through third-party OAuth providers (such as Google). When you choose to sign in
              this way, the provider authenticates you and shares a limited set of profile information (such as
              your email) with us so we can create and secure your account. We do not receive your password.
              Your use of the provider is also governed by that provider's own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2b. Cookies &amp; Local Storage</h2>
            <p>
              We use browser local storage and similar technologies to keep you signed in and to remember basic
              preferences. These are essential to the core functionality of the app. For more detail, see our{" "}
              <a href="/cookies" className="underline hover:text-primary">Cookie Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Data</h2>
            <p>
              We will only use your personal data when the law allows us to. Most commonly, we will use your
              personal data in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To register you as a new user.</li>
              <li>To provide and manage your account.</li>
              <li>To process and deliver your subscription.</li>
              <li>To improve our app, services, and user experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
            <p>
              We use trusted third-party services to operate our application and provide our services to you.
              These services may collect and process your data according to their own privacy policies.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Supabase:</strong> We use Supabase for authentication, database storage, and backend services.
                Supabase securely stores your user account information (email) and application data (bookmarks, profiles, analyses, chat history, uploaded decks, and export files).
              </li>
              <li>
                <strong>RevenueCat:</strong> We use RevenueCat to manage subscriptions and in-app purchase history.
                RevenueCat may process transaction data from Apple, Google, or Stripe to verify your subscription status and entitlements.
              </li>
              <li>
                <strong>AI processing:</strong> Video links, transcripts when available, startup profile context, and deck summaries may be sent to our AI gateway to generate the advice you request.
              </li>
              <li>
                <strong>OneSignal:</strong> If you opt in to push notifications, OneSignal processes notification tokens and delivery metadata so we can send reminders and product updates.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p>
              We have put in place appropriate security measures to prevent your personal data from being
              accidentally lost, used or accessed in an unauthorized way, altered or disclosed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. AI &amp; Advisory Interactions</h2>
            <p>
              Founder Mode Advice uses AI to analyze the videos and context you provide and to generate advice
              tailored to your situation. The video links, startup profiles, uploaded deck summaries, chat prompts, and generated advice you save are
              stored to provide the service to you. AI-generated advice is informational only and is not
              professional, legal, financial, or investment advice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Legal Rights</h2>
            <p>
              Under certain circumstances, you have rights under data protection laws in relation to your
              personal data, including the right to request access, correction, erasure, restriction,
              transfer, or to object to processing.
            </p>
            <p>
              You can delete your account and all associated data at any time through the Account settings
              within the app, or by following the steps on our{" "}
              <a href="/account-deletion" className="underline hover:text-primary">Account Deletion</a> page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or our privacy practices, please contact
              us at <a href="mailto:CA@saintmarlolabs.com" className="underline hover:text-primary">CA@saintmarlolabs.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
