import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AccountDeletion = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-y-auto bg-background p-6 md:p-12 pb-nav" style={{ paddingTop: 'calc(1.5rem + var(--safe-area-top))' }}>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-4xl font-bold tracking-tight mb-8">Delete Your Account</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p>
            You can permanently delete your Founder Mode Advice account and the data associated with it at any time.
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">How to Request Deletion</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>In the app:</strong> go to <strong>Account</strong> → <strong>Delete Account</strong> and confirm. This deletes your account immediately.</li>
              <li><strong>By email:</strong> if you can't access the app, email us from your account's email address at <a href="mailto:CA@saintmarlolabs.com" className="underline hover:text-primary">CA@saintmarlolabs.com</a> with the subject "Delete my account".</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">What Gets Deleted</h2>
            <p>When your account is deleted, we remove:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your account and profile information (such as your email and startup profiles).</li>
              <li>Your saved videos, bookmarks, AI-generated advice, chat history, and uploaded deck/export files stored under your user ID.</li>
              <li>App preferences, notification preferences, onboarding state, and subscription records stored in Supabase.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">What May Be Retained</h2>
            <p>
              We may retain a limited amount of information where required for legitimate legal, security, fraud-prevention,
              or accounting reasons — for example, payment processor records held by Stripe, Apple, Google, or RevenueCat that are needed to comply with tax or financial
              obligations. Retained data is kept only as long as necessary and then deleted according to those processors' policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">How Long It Takes</h2>
            <p>
              In-app deletion takes effect immediately. Email requests are typically handled within 30 days. Backups
              that may contain residual copies are cycled out on a rolling basis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Need Help?</h2>
            <p>
              Contact us at <a href="mailto:CA@saintmarlolabs.com" className="underline hover:text-primary">CA@saintmarlolabs.com</a> and we'll assist.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AccountDeletion;
