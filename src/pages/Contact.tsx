import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Contact = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-y-auto bg-background p-6 md:p-12 pb-nav" style={{ paddingTop: 'calc(1.5rem + var(--safe-area-top))' }}>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-4xl font-bold mb-8">Contact &amp; Support</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p>
            Have a question, found a bug, or want to share feedback? We'd love to hear from you. The fastest
            way to reach us is by email — we read every message.
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Email Us</h2>
            <a
              href="mailto:CA@saintmarlolabs.com"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-3 no-underline hover:bg-muted transition-colors"
            >
              <Mail className="h-5 w-5 text-primary" />
              <span className="font-medium">CA@saintmarlolabs.com</span>
            </a>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Helpful Links</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><a href="/faq" className="underline hover:text-primary">Frequently Asked Questions</a></li>
              <li><a href="/account-deletion" className="underline hover:text-primary">Delete your account</a></li>
              <li><a href="/privacy-policy" className="underline hover:text-primary">Privacy Policy</a></li>
              <li><a href="/terms-of-service" className="underline hover:text-primary">Terms of Service</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Contact;
