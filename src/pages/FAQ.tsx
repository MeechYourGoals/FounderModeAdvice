import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is Founder Mode Advice?",
    a: "Founder Mode Advice turns any video on the web — a TED talk, an interview, a founder's talk, or a creator on YouTube — into tactical advice tailored to you, your situation, and your startup. Instead of watching for hours, you paste a link and get the lessons that matter, applied to your context.",
  },
  {
    q: "Who is it for?",
    a: "Founders, operators, and builders who want to learn fast from the best thinking available online — without being locked into a single platform's roster of experts.",
  },
  {
    q: "How is this different from MasterClass, Augment, or Delphi?",
    a: "Those platforms cost more and only give you the people they have on their roster, with one-size-fits-all takes. Founder Mode Advice lets you learn from anyone with a video online and tailors every video to your specific situation and startup.",
  },
  {
    q: "How does the AI-generated advice work?",
    a: "Our AI analyzes the video you submit along with the context in your startup profile, then surfaces and ranks the most relevant, actionable lessons for you. Advice is informational only and is not professional, legal, or financial advice — always use your own judgment.",
  },
  {
    q: "What kinds of videos can I use?",
    a: "Most public video links work, including YouTube. You're responsible for ensuring you have the right to submit a given link.",
  },
  {
    q: "How do I sign in?",
    a: "You can sign in with Google or with an email and password. Your session is kept securely on your device so you stay signed in between visits.",
  },
  {
    q: "How is my data handled?",
    a: "We store your account information and the advice you save so we can provide the service. See our Privacy Policy and Cookie Policy for details. You can delete your account and data at any time.",
  },
  {
    q: "How do I get support?",
    a: "Email us at CA@saintmarlolabs.com or visit the Contact page and we'll help.",
  },
];

const FAQ = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-y-auto bg-background p-6 md:p-12" style={{ paddingTop: 'calc(1.5rem + var(--safe-area-top))', paddingBottom: 'calc(1.5rem + var(--safe-area-bottom))' }}>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-4xl font-bold mb-8">Frequently Asked Questions</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          {FAQS.map((item) => (
            <section key={item.q}>
              <h2 className="text-xl sm:text-2xl font-semibold mb-2">{item.q}</h2>
              <p>{item.a}</p>
            </section>
          ))}

          <section>
            <p className="text-muted-foreground">
              Still have questions? Contact us at{" "}
              <a href="mailto:CA@saintmarlolabs.com" className="underline hover:text-primary">CA@saintmarlolabs.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
