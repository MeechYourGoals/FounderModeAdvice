import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CookiePolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-y-auto bg-background p-6 md:p-12 pb-nav" style={{ paddingTop: 'calc(1.5rem + var(--safe-area-top))' }}>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground italic">Last Updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. What We Use</h2>
            <p>
              Founder Mode Advice uses cookies and similar browser storage technologies (such as local storage)
              to operate the app and keep you signed in. We aim to keep this to what is necessary for the service
              to function.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Essential Storage</h2>
            <p>
              These are required for the app to work and cannot be turned off within the app:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Authentication &amp; session storage</strong> keeps you securely signed in between visits so you don't have to log in every time.</li>
              <li><strong>Preferences</strong> remember basic settings such as your light/dark theme.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Analytics</h2>
            <p>
              If we use analytics to understand how the app is used and to improve it, any such storage is used
              only in aggregate to measure usage and performance. We do not sell your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
            <p>
              You can control or delete cookies and local storage through your browser or device settings.
              Please note that disabling essential storage may prevent you from staying signed in or using
              parts of the app.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Contact Us</h2>
            <p>
              Questions about this Cookie Policy? Contact us at{" "}
              <a href="mailto:CA@saintmarlolabs.com" className="underline hover:text-primary">CA@saintmarlolabs.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
