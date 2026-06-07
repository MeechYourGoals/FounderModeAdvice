import { Brain, TrendingUp, Target, ArrowRight, MessageSquare, ShieldCheck, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { SampleDemo } from "@/components/marketing/SampleDemo";
import { TIER_PRICING, type SubscriptionTier } from "@/types/subscription";
import heroBg from "@/assets/hero-bg.jpg";

export const PublicLanding = () => {
  const navigate = useNavigate();

  const goToAuth = () => navigate("/auth");
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Navigation - relative top bar with safe area (Despia pattern) */}
      <nav className="glass-nav relative z-50 border-b border-border" style={{ paddingTop: 'var(--safe-area-top)' }}>
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="font-bold text-sm sm:text-lg hover:text-primary transition-colors">Founder Mode Advice</button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={() => scrollTo("demo")}>
              Demo
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={() => scrollTo("pricing")}>
              Pricing
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={goToAuth}>
              Sign In
            </Button>
            <Button size="sm" onClick={goToAuth}>
              <span className="sm:hidden">Sign In</span>
              <span className="hidden sm:inline">Get Started</span>
              <ArrowRight className="ml-1 h-4 w-4 hidden sm:inline-block" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Scrollable content (Despia pattern) */}
      <div className="despia-scroll">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'var(--gradient-hero)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'var(--gradient-mesh)' }}
        />
        <div className="container relative mx-auto px-4 py-16 sm:py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight text-foreground animate-slide-up">
              Build Your Boardroom
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-slide-up">
              Turn founder, operator, and business-building videos into personalized advice for your company, industry, and stage — whether you run a startup, an agency, a local shop, a storefront, or a side hustle.
            </p>
            <div className="flex flex-col items-center gap-2 animate-slide-up">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8" onClick={goToAuth}>
                  Analyze a Video Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8" onClick={goToAuth}>
                  Sign In
                </Button>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Create your free account to start — no credit card required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-12 sm:py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
            Turn expert content into personalized strategy
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard
              icon={<Brain className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Beyond passive watching"
              description="Convert interviews, talks, and podcasts into structured lessons, risks, and action items for your business"
            />
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Tailored to your business"
              description="Map the speaker's thinking to your industry, stage, customers, and next decision"
            />
            <FeatureCard
              icon={<Target className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Ask any video"
              description="Open a transcript-grounded chat after analysis and dig into the advice behind each recommendation"
            />
          </div>
        </div>
      </section>

      {/* Interactive sample demo */}
      <SampleDemo />

      {/* Positioning */}
      <section className="container mx-auto px-4 pb-12 sm:pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto glass rounded-3xl p-5 sm:p-8 md:p-10 border-primary/15">
          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-6 md:gap-10 items-start">
            <div className="space-y-4">
              <BadgeLabel>Advice for every kind of builder</BadgeLabel>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                You do not need a boardroom of advisors to learn like you have one.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                The best founders, operators, and business owners have shared thousands of hours of hard-won lessons in public interviews, podcasts, and talks. Founder Mode Advice turns that content into structured guidance tailored to your business — without implying affiliation, endorsement, or replacing real advisors.
              </p>
            </div>
            <div className="space-y-3">
              <MiniFeature icon={<ShieldCheck className="w-4 h-4" />} title="Any public YouTube video in" description="Paste a business, founder, operator, investor, strategy, or leadership video from YouTube. Spotify and Apple Podcasts links are not supported because those platforms do not provide public transcripts." />
              <MiniFeature icon={<Target className="w-4 h-4" />} title="Tailored advice out" description="Insight mapped to your industry, stage, customers, and constraints — not generic venture-scale playbooks." />
              <MiniFeature icon={<MessageSquare className="w-4 h-4" />} title="Transcript-grounded Q&A" description="Ask follow-up questions directly against the video transcript and your business context after analysis." />
            </div>
          </div>
          <p className="mt-6 text-[11px] sm:text-xs text-muted-foreground">
            Founder Mode Advice analyzes public content only. It is independent and does not provide private access, endorsement, or investment advice from any person or firm referenced in a video.
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-muted/30 py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Not Another Locked-In Subscription
              </h2>
              <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                MasterClass, Augment, and Delphi cost a lot more and only give you the people on
                their roster — and even then, you get the generic takes those people chose to share.
                One clip, the same advice for thousands of different viewers.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="glass rounded-2xl p-5 sm:p-6 space-y-3">
                <h3 className="font-semibold text-base sm:text-lg text-muted-foreground">
                  MasterClass · Augment · Delphi
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <ComparisonItem positive={false}>Locked to who they have on the platform</ComparisonItem>
                  <ComparisonItem positive={false}>One-size-fits-all insights for every viewer</ComparisonItem>
                  <ComparisonItem positive={false}>Premium price for a fixed library</ComparisonItem>
                </ul>
              </div>
              <div className="glass rounded-2xl p-5 sm:p-6 space-y-3 border border-primary/30">
                <h3 className="font-semibold text-base sm:text-lg text-primary">
                  Founder Mode Advice
                </h3>
                <ul className="space-y-2 text-sm">
                  <ComparisonItem positive>Learn from anyone with a video online</ComparisonItem>
                  <ComparisonItem positive>Every video tailored to your business and industry</ComparisonItem>
                  <ComparisonItem positive>One app, any source — at a fraction of the cost</ComparisonItem>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-12 sm:py-16 md:py-24 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-3 mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Simple, honest pricing</h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free. Upgrade when you're ready. Cancel anytime.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {(Object.keys(TIER_PRICING) as SubscriptionTier[]).map((key) => (
              <PricingCard key={key} tier={key} onSelect={goToAuth} />
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Prices in USD. Web subscriptions are billed via Stripe; in-app subscriptions via the App Store.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12 sm:py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center space-y-4 sm:space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Ready to build your boardroom?
          </h2>
          <p className="text-sm sm:text-lg text-muted-foreground">
            Create your free account, paste a video, and get advice tailored to your business in minutes.
          </p>
          <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8" onClick={goToAuth}>
            Analyze Your First Video
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  );
};

const BadgeLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
    {children}
  </div>
);

const MiniFeature = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="rounded-2xl bg-background/70 border border-border p-4">
    <div className="flex items-center gap-2 font-semibold text-sm sm:text-base mb-1">
      <span className="text-primary">{icon}</span>
      {title}
    </div>
    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  return (
    <div className="glass elevate-hover p-4 sm:p-6 rounded-2xl hover:border-primary/30">
      <div className="text-primary mb-3 sm:mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

const PricingCard = ({ tier, onSelect }: { tier: SubscriptionTier; onSelect: () => void }) => {
  const plan = TIER_PRICING[tier];
  const isFree = tier === "free";
  return (
    <div
      className={`relative glass rounded-2xl p-5 sm:p-6 flex flex-col ${
        plan.recommended ? "border-2 border-primary shadow-lg" : "border border-border"
      }`}
    >
      {plan.recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
          Most Popular
        </span>
      )}
      <h3 className="text-lg font-bold">{plan.displayName}</h3>
      <div className="mt-2 mb-4">
        <span className="text-3xl font-bold">{isFree ? "Free" : `$${plan.price}`}</span>
        {!isFree && <span className="text-sm text-muted-foreground">/month</span>}
      </div>
      <ul className="space-y-2 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        className="w-full mt-6"
        variant={plan.recommended ? "default" : "outline"}
        onClick={onSelect}
      >
        {isFree ? "Start free" : `Choose ${plan.displayName}`}
      </Button>
    </div>
  );
};

const ComparisonItem = ({ positive, children }: { positive: boolean; children: React.ReactNode }) => {
  const Icon = positive ? Check : X;
  return (
    <li className="flex items-start gap-2">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${positive ? "text-primary" : "text-muted-foreground"}`} />
      <span>{children}</span>
    </li>
  );
};
