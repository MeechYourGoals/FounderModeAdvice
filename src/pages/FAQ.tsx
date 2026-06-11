import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What does Founder Mode Advice do?",
    a: "Founder Mode Advice turns any business, founder, operator, investor, strategy, or leadership video into tactical advice tailored to you and your business. Instead of watching for hours, you paste a link and get the takeaways, risks, opportunities, and action items that matter — applied to your industry and stage.",
  },
  {
    q: "Do I need an account to analyze a video?",
    a: "Yes. Creating a free account takes a few seconds and lets us save your analyses, profiles, and folders. The free plan includes a few analyses per month with no credit card required.",
  },
  {
    q: "Is this only for tech startups?",
    a: "No. It's built for every kind of builder — local business owners, mom-and-pop shops, service providers, clothing brands, restaurants, fitness businesses, agencies, creators, consultants, bootstrapped founders, and venture-backed startups alike. Set your industry on your business profile and the advice adapts to your business type.",
  },
  {
    q: "What kinds of videos can I analyze?",
    a: "Public YouTube links work. Spotify and Apple Podcasts are not supported because those platforms do not expose public transcripts. You're responsible for ensuring you have the right to submit a given link.",
  },
  {
    q: "How do business profiles work?",
    a: "Create a profile for each company, idea, side hustle, store, agency, or project — with its name, description, industry, stage, and context. The selected profile personalizes every analysis (and, on The Boardroom, every video chat) to that business.",
  },
  {
    q: "How do folders work?",
    a: "Folders let you organize your analyses and bookmarks by topic, business, workflow, or learning path so your advice stays structured and easy to revisit.",
  },
  {
    q: "What is included in The C-Suite plan?",
    a: "The C-Suite ($9.99/month) includes 20 video analyses per month, up to 3 business profiles, folder organization, and personalized insights tuned to your industry and stage.",
  },
  {
    q: "What is included in The Boardroom plan?",
    a: "The Boardroom ($19.99/month) includes unlimited video analyses, unlimited business profiles, and unlimited Ask-the-video AI chat — a transcript-grounded assistant you can ask follow-up questions about each analyzed video. It's best for people running multiple ventures, clients, or business ideas.",
  },
  {
    q: "What happens if I hit my monthly limits?",
    a: "We'll let you know and prompt you to upgrade. Your saved analyses, profiles, and folders stay intact, and your monthly analysis allowance resets at the start of each month.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Manage or cancel your subscription anytime from your Account page (Stripe customer portal on web, or the App Store/Customer Center in the app). You keep access until the end of your current billing period.",
  },
  {
    q: "How does the AI-generated advice work?",
    a: "Our AI analyzes the video you submit along with the context in your business profile, then surfaces and ranks the most relevant, actionable lessons for you. The Ask-the-video chat only answers questions about the video and your business — not unrelated topics. Advice is informational only and is not professional, legal, or financial advice — always use your own judgment.",
  },
  {
    q: "Is my business information private?",
    a: "Yes. Your profiles, analyses, chats, and billing metadata are tied to your account and protected by row-level security so only you can access them. See our Privacy Policy and Cookie Policy for details. You can delete your account and data at any time.",
  },
  {
    q: "How do I contact support?",
    a: "Email us at CA@saintmarlolabs.com or visit the Contact page and we'll help.",
  },
];

const FAQ = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-y-auto bg-background p-6 md:p-12 pb-nav" style={{ paddingTop: 'calc(1.5rem + var(--safe-area-top))' }}>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">FAQ</p>
        <h1 className="text-4xl font-bold tracking-tight mb-8">
          Frequently asked{" "}
          <span className="font-display font-medium italic text-gradient">questions</span>
        </h1>

        <div className="space-y-4">
          {FAQS.map((item) => (
            <section key={item.q} className="rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/25">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight mb-2">{item.q}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </section>
          ))}

          <section className="pt-2">
            <p className="text-sm text-muted-foreground">
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
