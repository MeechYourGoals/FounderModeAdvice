import { ArrowRight, MessageSquare, ShieldCheck, Check, X, Target, Lightbulb, Building2, Folder, FolderKanban, Cloud, Download, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";

import { Footer } from "@/components/Footer";
import { SampleDemo } from "@/components/marketing/SampleDemo";
import { Reveal } from "@/hooks/useReveal";
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
      <nav className="glass-nav relative z-50 border-b border-border/60" style={{ paddingTop: 'var(--safe-area-top)' }}>
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Founder Mode Advice — home">
            <BrandLogo className="h-9 sm:h-11 w-auto" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:flex rounded-full" onClick={() => scrollTo("demo")}>
              Demo
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:flex rounded-full" onClick={() => scrollTo("pricing")}>
              Pricing
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="hidden sm:flex rounded-full" onClick={goToAuth}>
              Sign In
            </Button>
            <Button size="sm" className="rounded-full px-4" onClick={goToAuth}>
              <span className="sm:hidden">Sign In</span>
              <span className="hidden sm:inline">Get Started</span>
              <ArrowRight className="ml-1 h-4 w-4 hidden sm:inline-block" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Scrollable content (Despia pattern) */}
      <div className="despia-scroll">
      {/* Hero — open editorial layout over aurora + grain */}
      <section className="grain relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0" style={{ background: 'var(--gradient-hero)' }} />
        <div className="absolute inset-0" style={{ background: 'var(--gradient-mesh)' }} />
        <div className="container relative mx-auto px-4 pt-14 pb-16 sm:pt-24 sm:pb-24 lg:pt-28 lg:pb-32">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            {/* Left: copy */}
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary shadow-sm">
                  Personalized advice from any business video
                </span>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="mt-6 text-[2.75rem] leading-[1.04] sm:text-6xl lg:text-[4.25rem] font-bold tracking-tight text-foreground">
                  Build your{" "}
                  <span className="font-display font-medium italic text-gradient">boardroom</span>.
                  <span className="block mt-2">Instill their insights.</span>
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-6 max-w-xl text-lg sm:text-xl text-foreground/90 leading-relaxed">
                  Turn founder, operator, and business-building videos into personalized advice for your company,
                  industry, and stage — startup, agency, local shop, storefront, or side hustle.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button size="lg" className="h-12 rounded-full px-7 text-base" onClick={goToAuth}>
                    Analyze a Video Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 rounded-full bg-card/80 px-7 text-base" onClick={() => scrollTo("demo")}>
                    See the demo
                  </Button>
                </div>
              </Reveal>
              <Reveal delay={320}>
                <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-base text-foreground/90">
                  <li className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Free forever tier</li>
                  <li className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> No credit card</li>
                  <li className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> iOS, Android, web</li>
                </ul>
              </Reveal>
            </div>

            {/* Right: floating framed product preview */}
            <Reveal delay={200} className="relative">
              <div aria-hidden className="absolute -inset-10 -z-10 rounded-full bg-primary/20 blur-3xl" />
              <div className="animate-float">
                <HeroPreview />
              </div>
            </Reveal>
          </div>
        </div>
        {/* Hairline fade into the page body */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>


      {/* How it works — numbered steps */}
      <section className="container mx-auto px-4 pt-14 sm:pt-20 md:pt-28 pb-8 sm:pb-10 md:pb-12">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">How it works</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center mb-10 sm:mb-14">
              Turn expert content into{" "}
              <span className="font-display font-medium italic text-gradient">personalized strategy</span>
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <Reveal delay={0}>
              <FeatureCard
                step="01"
                title="Beyond passive watching"
                description="Convert interviews, talks, and podcasts into structured lessons, risks, and action items for your business"
              />
            </Reveal>
            <Reveal delay={100}>
              <FeatureCard
                step="02"
                title="Tailored to your business"
                description="Map the speaker's thinking to your industry, stage, customers, and next decision"
              />
            </Reveal>
            <Reveal delay={200}>
              <FeatureCard
                step="03"
                title="Ask any video"
                description="Open a transcript-grounded chat after analysis and dig into the advice behind each recommendation"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Interactive sample demo */}
      <SampleDemo />

      {/* Value prop — capture, organize, and share insights */}
      <section className="container mx-auto px-4 py-12 sm:py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">Your insight library</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center">
              Stop losing your best insights in{" "}
              <span className="font-display font-medium italic text-gradient">notebooks and Apple Notes</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base sm:text-lg text-foreground/90 leading-relaxed">
              Founders watch hundreds of hours of podcasts, interviews, and tactical videos — and the insights
              usually end up scattered across notebooks, Apple Notes, screenshots, or half-remembered episodes.
              Founder Mode Advice turns the content you study into organized, cloud-accessible insight folders
              you can revisit, export, and share with the exact people who need them.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Reveal delay={0}>
              <ValueCard
                icon={<FolderKanban className="w-4 h-4" />}
                title="Organized insight folders"
                description="Build a folder for each startup, function, or initiative — Marketing, Hiring, Fundraising, Product, HR — and save every analyzed video into the right one."
              />
            </Reveal>
            <Reveal delay={80}>
              <ValueCard
                icon={<Cloud className="w-4 h-4" />}
                title="Cloud-accessible anywhere"
                description="Your library lives in the cloud, not on a single device. Pick up your insights on web, iOS, or Android — right where you left off."
              />
            </Reveal>
            <Reveal delay={160}>
              <ValueCard
                icon={<Download className="w-4 h-4" />}
                title="Export when you need it"
                description="Download an analysis or a whole folder as PDF, CSV, Markdown, or JSON — ready for decks, docs, and team wikis."
              />
            </Reveal>
            <Reveal delay={240}>
              <ValueCard
                icon={<Users className="w-4 h-4" />}
                title="Invite the right people"
                badge="Paid plans"
                description="On a paid plan, share a single folder with a teammate, advisor, or new hire — they see only those insights, never your entire workspace. On the free plan your folders stay private to you."
              />
            </Reveal>
          </div>

          <Reveal delay={120}>
            <div className="mt-6 glass rounded-3xl border-primary/15 p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold text-lg sm:text-xl">Knowledge transfer without repeating yourself</h3>
                <p className="mt-1 text-base text-foreground/85 leading-relaxed">
                  Onboarding a marketing hire or briefing an HR leader? Invite them to the relevant folder so the
                  playbook is already waiting — instead of re-explaining the same hard-won lessons every time.
                </p>
                <p className="mt-2 text-sm font-medium text-primary">
                  Folder sharing is included on The C-Suite and The Boardroom plans.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Positioning */}
      <section className="container mx-auto px-4 pb-12 sm:pb-16 md:pb-24">
        <Reveal>
          <div className="max-w-5xl mx-auto glass rounded-3xl p-5 sm:p-8 md:p-10 border-primary/15 shadow-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 md:items-stretch">
              <div className="space-y-4 flex flex-col">
                <BadgeLabel>Advice for every kind of builder</BadgeLabel>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                  You do not need a boardroom of advisors to{" "}
                  <span className="font-display font-medium italic text-gradient">learn like you have one</span>.
                </h2>
                <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">
                  The best founders, operators, and business owners have shared thousands of hours of hard-won lessons in public interviews, podcasts, and talks. Founder Mode Advice turns that content into structured guidance tailored to your business — without implying affiliation, endorsement, or replacing real advisors.
                </p>
              </div>
              <div className="space-y-3 flex flex-col">
                <MiniFeature icon={<ShieldCheck className="w-4 h-4" />} title="Any public video in" description="Paste a business, founder, operator, investor, strategy, or leadership video from YouTube, TikTok, Instagram, X, Vimeo, LinkedIn, or any public podcast or web video URL." />
                <MiniFeature icon={<Target className="w-4 h-4" />} title="Tailored advice out" description="Insight mapped to your industry, stage, customers, and constraints — not generic venture-scale playbooks." />
                <MiniFeature icon={<MessageSquare className="w-4 h-4" />} title="Transcript-grounded Q&A" description="Ask follow-up questions directly against the video transcript and your business context after analysis." />
              </div>
            </div>
            <p className="mt-6 text-sm text-foreground/80">
              Founder Mode Advice analyzes public content only. It is independent and does not provide private access, endorsement, or investment advice from any person or firm referenced in a video.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Social Proof */}
      <section className="relative bg-muted/30 py-14 sm:py-20 md:py-28 overflow-hidden">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-10">
            <Reveal>
              <div className="text-center space-y-3">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                  Not another{" "}
                  <span className="font-display font-medium italic">locked-in</span> subscription
                </h2>
                <p className="text-base sm:text-xl text-foreground/90 max-w-2xl mx-auto">
                  MasterClass, Augment, and Delphi cost a lot more and only give you the people on
                  their roster — and even then, you get the generic takes those people chose to share.
                  One clip, the same advice for thousands of different viewers.
                </p>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 sm:items-stretch">
              <Reveal delay={0}>
                <div className="glass h-full rounded-2xl p-5 sm:p-6 space-y-3">
                  <h3 className="font-semibold text-lg sm:text-xl text-foreground/85">
                    MasterClass · Augment · Delphi
                  </h3>
                  <ul className="space-y-2 text-base text-foreground/85">
                    <ComparisonItem positive={false}>Locked to who they have on the platform</ComparisonItem>
                    <ComparisonItem positive={false}>One-size-fits-all insights for every viewer</ComparisonItem>
                    <ComparisonItem positive={false}>Premium price for a fixed library</ComparisonItem>
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="glass h-full rounded-2xl p-5 sm:p-6 space-y-3 ring-glow border border-primary/30">
                  <h3 className="font-semibold text-lg sm:text-xl text-primary">
                    Founder Mode Advice
                  </h3>
                  <ul className="space-y-2 text-base text-foreground">
                    <ComparisonItem positive>Learn from anyone with a video online</ComparisonItem>
                    <ComparisonItem positive>Every video tailored to your business and industry</ComparisonItem>
                    <ComparisonItem positive>One app, any source — at a fraction of the cost</ComparisonItem>
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-14 sm:py-20 md:py-28 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center space-y-3 mb-10 sm:mb-14">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                Simple,{" "}
                <span className="font-display font-medium italic text-gradient">honest</span> pricing
              </h2>
              <p className="text-base sm:text-xl text-foreground/90 max-w-2xl mx-auto">
                Start free. Upgrade when you're ready. Cancel anytime.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:items-stretch">
            {(Object.keys(TIER_PRICING) as SubscriptionTier[]).map((key, i) => (
              <Reveal key={key} delay={i * 100}>
                <PricingCard tier={key} onSelect={goToAuth} />
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-foreground/80">
            Prices in USD. Web subscriptions are billed via Stripe; in-app subscriptions via the App Store.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">FAQ</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              Common{" "}
              <span className="font-display font-medium italic text-gradient">questions</span>.
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={(i % 2) * 80}>
                <Card className="h-full bg-card/95 elevate-hover">
                  <CardContent className="p-5">
                    <h3 className="text-lg font-semibold">{f.q}</h3>
                    <p className="mt-2 text-base text-foreground/85 leading-relaxed">{f.a}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — primary-filled with mesh + grain */}
      <section className="container mx-auto px-4 pb-16 sm:pb-24">
        <Reveal>
          <div className="grain relative max-w-5xl mx-auto overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-elegant sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(80% 100% at 20% 0%, hsl(199 90% 60% / 0.5), transparent 60%), radial-gradient(70% 90% at 90% 100%, hsl(224 90% 50% / 0.45), transparent 60%)",
              }}
            />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
                Ready to build your{" "}
                <span className="font-display font-medium italic">boardroom</span>?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/95">
                Create your free account, paste a video, and get advice tailored to your business in minutes.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button size="lg" variant="secondary" className="h-12 rounded-full px-7 text-base" onClick={goToAuth}>
                  Analyze your first video <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-primary-foreground/30 bg-transparent px-7 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50 hover:text-primary-foreground"
                  onClick={() => scrollTo("pricing")}
                >
                  See pricing
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>


      <Footer />
      </div>
    </div>
  );
};

const BadgeLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
    {children}
  </div>
);

const ValueCard = ({ icon, title, description, badge }: { icon: React.ReactNode; title: string; description: string; badge?: string }) => (
  <div className="glass elevate-hover h-full rounded-2xl p-5 sm:p-6 hover:border-primary/30">
    <div className="flex items-center gap-2.5 mb-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <h3 className="font-semibold text-base sm:text-lg">{title}</h3>
      {badge && (
        <span className="ml-auto shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {badge}
        </span>
      )}
    </div>
    <p className="text-sm sm:text-base text-foreground/85 leading-relaxed">{description}</p>
  </div>
);

const MiniFeature = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="flex-1 rounded-2xl bg-background/70 border border-border p-4 transition-colors hover:border-primary/30">
    <div className="flex items-center gap-2 font-semibold text-base sm:text-lg mb-1">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      {title}
    </div>
    <p className="text-sm sm:text-base text-foreground/85 leading-relaxed">{description}</p>
  </div>
);

const FeatureCard = ({ step, title, description }: { step: string; title: string; description: string }) => {
  return (
    <div className="glass elevate-hover relative h-full overflow-hidden p-5 sm:p-6 rounded-2xl hover:border-primary/30">
      <span aria-hidden className="font-display block text-4xl sm:text-5xl font-medium italic leading-none text-primary/25">
        {step}
      </span>
      <h3 className="font-semibold text-lg sm:text-xl mt-4 mb-1 sm:mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-foreground/85 leading-relaxed">{description}</p>
    </div>
  );
};

const PricingCard = ({ tier, onSelect }: { tier: SubscriptionTier; onSelect: () => void }) => {
  const plan = TIER_PRICING[tier];
  const isFree = tier === "free";
  return (
    <div
      className={`relative glass h-full rounded-2xl p-5 sm:p-6 flex flex-col transition-transform duration-300 ${
        plan.recommended ? "ring-glow border border-primary/40 md:scale-[1.03]" : "border border-border"
      }`}
    >
      {plan.recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-sm font-semibold text-primary-foreground shadow-md">
          Most Popular
        </span>
      )}
      <h3 className="text-xl font-bold">{plan.displayName}</h3>
      <div className="mt-2 mb-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight">{isFree ? "Free" : `$${plan.price}`}</span>
        {!isFree && <span className="text-base text-foreground/80">/month</span>}
      </div>
      <ul className="space-y-2.5 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-base">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-3 w-3 text-primary" />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        className="w-full mt-6 rounded-full"
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
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${positive ? "text-primary" : "text-foreground/60"}`} />
      <span>{children}</span>
    </li>
  );
};

const FAQS = [
  {
    q: "What kinds of videos work?",
    a: "Any public video link — YouTube, TikTok, Instagram Reels, X / Twitter video, Vimeo, LinkedIn, or a podcast MP3. Founder interviews, talks, operator deep-dives, short-form clips. Private or login-gated posts aren't supported.",
  },
  {
    q: "How is this different from MasterClass or Augment?",
    a: "Those platforms lock you to a fixed roster and give every viewer the same generic clip. Founder Mode Advice works on any video online and tailors every insight to your industry, stage, and customers.",
  },
  {
    q: "Do I need to know who the speaker is?",
    a: "No. Paste any business video and you'll get structured lessons, risks, and action items mapped to your business — even if you've never heard of the person.",
  },
  {
    q: "Is the free tier actually useful?",
    a: "Yes. The free tier includes real video analyses every month with the full insights view. Upgrade when you want more volume and the ask-the-video chat.",
  },
  {
    q: "How do I cancel?",
    a: "One tap in Settings. Subscriptions renew until canceled and you keep access until the period ends.",
  },
  {
    q: "Does this replace real advisors?",
    a: "No. Founder Mode Advice analyzes public content only. It's independent, doesn't imply endorsement, and isn't a substitute for legal, financial, or fiduciary advice.",
  },
] as const;

const HeroPreview = () => (
  <div className="rounded-3xl bg-card/95 p-4 sm:p-5 ring-1 ring-border/50 shadow-[var(--shadow-elegant)] backdrop-blur-sm">
    <div className="flex items-center gap-1.5 px-1 pb-3">
      <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
      <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
      <span className="ml-3 text-xs uppercase tracking-wider text-foreground/70">foundermodeadvice.com</span>
    </div>

    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-3 mb-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageSquare className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold truncate">How we bootstrapped a 7-figure coffee roaster</p>
        <p className="text-sm text-foreground/75 truncate">YouTube · The Founder Podcast</p>
      </div>
      <span className="hidden sm:inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        <Building2 className="mr-1 h-3 w-3" /> Maple &amp; Oak
      </span>
    </div>

    <div className="space-y-2.5">
      {[
        { tag: "Margin leverage", text: "Raise wholesale prices 8% before peak season — your roaster cost basis already absorbed it." },
        { tag: "Influencer marketing", text: "Skip macro creators. Partner with 5 local micro-baristas for in-cafe content trades." },
        { tag: "Competitor analysis", text: "Blue Bottle's loyalty leans on streaks — your subscription box already has the data hook." },
      ].map((c) => (
        <div key={c.tag} className="rounded-xl border border-border/60 bg-background/70 p-3 transition-colors hover:border-primary/30">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">{c.tag}</span>
            <span className="ml-auto text-xs text-foreground/70">Tailored</span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">{c.text}</p>
        </div>
      ))}
    </div>

    <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground/80">
        <Folder className="h-3 w-3" /> Saved to · Coffee playbook
      </span>
      <span className="text-xs font-medium text-primary">12 insights</span>
    </div>
  </div>
);
