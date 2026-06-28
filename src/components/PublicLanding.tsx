import {
  ArrowRight,
  Check,
  Layers,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";

import { Footer } from "@/components/Footer";
import { SampleDemo } from "@/components/marketing/SampleDemo";
import { HeroProductScene } from "@/components/marketing/HeroProductScene";
import { Reveal } from "@/hooks/useReveal";
import { TIER_PRICING, type SubscriptionTier } from "@/types/subscription";
import heroBg from "@/assets/hero-bg.jpg";

const NAV_LINKS = [
  { label: "Product", target: "product" },
  { label: "Use Cases", target: "use-cases" },
  { label: "Pricing", target: "pricing" },
  { label: "Demo", target: "demo" },
] as const;

export const PublicLanding = () => {
  const navigate = useNavigate();

  const goToAuth = () => navigate("/auth");
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Navigation — minimal, premium */}
      <nav className="glass-nav relative z-50 border-b border-border/60" style={{ paddingTop: "var(--safe-area-top)" }}>
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Founder Mode Advice — home">
            <BrandLogo className="h-9 sm:h-11 w-auto" />
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            {NAV_LINKS.map((link) => (
              <Button
                key={link.target}
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex rounded-full text-foreground/70 hover:text-foreground"
                onClick={() => scrollTo(link.target)}
              >
                {link.label}
              </Button>
            ))}
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full" onClick={goToAuth}>
              Sign In
            </Button>
            <Button size="sm" className="rounded-full px-4" onClick={goToAuth}>
              <span className="sm:hidden">Sign In</span>
              <span className="hidden sm:inline">Analyze a Video</span>
              <ArrowRight className="ml-1.5 h-4 w-4 hidden sm:inline-block" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Scrollable content (Despia pattern) */}
      <div className="despia-scroll">
        {/* ---------------------------------------------------------------- */}
        {/* Hero — command-center layout over grid + grain                   */}
        {/* ---------------------------------------------------------------- */}
        <section className="grain relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
          <div className="absolute inset-0" style={{ background: "var(--gradient-mesh)" }} />
          <div aria-hidden className="bg-grid absolute inset-0" />
          <div className="container relative mx-auto px-4 pt-14 pb-16 sm:pt-24 sm:pb-24 lg:pt-28 lg:pb-32">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
              {/* Left: copy */}
              <div>
                <Reveal>
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Transcript-grounded founder intelligence
                  </span>
                </Reveal>
                <Reveal delay={80}>
                  <h1 className="mt-6 text-[2.75rem] leading-[1.04] sm:text-6xl lg:text-[4.25rem] font-bold tracking-tight text-foreground">
                    Turn founder videos into{" "}
                    <span className="font-display font-medium italic text-gradient">operating decisions</span>.
                  </h1>
                </Reveal>
                <Reveal delay={160}>
                  <p className="mt-6 max-w-xl text-lg sm:text-xl text-foreground/90 leading-relaxed">
                    Paste a founder, investor, or operator video. Founder Mode Advice extracts transcript-grounded
                    lessons, risks, action items, and follow-up Q&amp;A tailored to your company, stage, and next
                    decision.
                  </p>
                </Reveal>
                <Reveal delay={240}>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button size="lg" className="h-12 rounded-full px-7 text-base" onClick={goToAuth}>
                      Analyze a Video <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button size="lg" variant="outline" className="h-12 rounded-full bg-card/80 px-7 text-base" onClick={() => scrollTo("demo")}>
                      View product tour
                    </Button>
                  </div>
                </Reveal>
                <Reveal delay={320}>
                  <p className="mt-7 text-sm text-foreground/70">
                    Start with a free analysis. No card required.
                    <span className="mx-2 text-foreground/30">·</span>
                    Works on web, iOS, and Android.
                  </p>
                </Reveal>
              </div>

              {/* Right: dimensional product scene */}
              <Reveal delay={200} className="relative">
                <div className="animate-float">
                  <HeroProductScene />
                </div>
              </Reveal>
            </div>
          </div>
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Credibility — product truth, not logos                           */}
        {/* ---------------------------------------------------------------- */}
        <section id="product" className="container mx-auto px-4 pt-14 sm:pt-20 md:pt-28 pb-4 sm:pb-8 scroll-mt-20">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">
                Why it&apos;s different
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center max-w-3xl mx-auto">
                Not another AI summary. A{" "}
                <span className="font-display font-medium italic text-gradient">source-grounded operating system</span>.
              </h2>
            </Reveal>
            <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <Reveal delay={0}>
                <ProofCard
                  index="01"
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title="Transcript-grounded"
                  description="Every lesson, risk, and recommendation ties back to what was actually said — with timecoded citations you can verify."
                />
              </Reveal>
              <Reveal delay={100}>
                <ProofCard
                  index="02"
                  icon={<Target className="h-4 w-4" />}
                  title="Company-specific"
                  description="Output adapts to your stage, industry, business model, and the decision in front of you — not generic venture-scale platitudes."
                />
              </Reveal>
              <Reveal delay={200}>
                <ProofCard
                  index="03"
                  icon={<Layers className="h-4 w-4" />}
                  title="Built into a library"
                  description="Save analyses into folders so insight compounds over time, instead of scattering across notebooks and screenshots."
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* How it works — four steps                                        */}
        {/* ---------------------------------------------------------------- */}
        <section className="container mx-auto px-4 pt-14 sm:pt-20 md:pt-24 pb-8 sm:pb-10">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">How it works</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center mb-3">
                From transcript to{" "}
                <span className="font-display font-medium italic text-gradient">operating memo</span> in minutes
              </h2>
              <p className="mx-auto max-w-2xl text-center text-base sm:text-lg text-foreground/85 leading-relaxed">
                Paste a founder talk, investor interview, operator breakdown, or strategy lecture. Add your company
                context. Get structured intelligence you can act on.
              </p>
            </Reveal>
            <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {STEPS.map((s, i) => (
                <Reveal key={s.step} delay={i * 90}>
                  <StepCard {...s} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Product surface — interactive sample                             */}
        {/* ---------------------------------------------------------------- */}
        <SampleDemo />

        {/* ---------------------------------------------------------------- */}
        {/* Private library story                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="container mx-auto px-4 py-12 sm:py-16 md:py-24">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">Your founder library</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center max-w-3xl mx-auto">
                A private boardroom that{" "}
                <span className="font-display font-medium italic text-gradient">compounds</span>, not a feed you forget
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-base sm:text-lg text-foreground/85 leading-relaxed">
                Founders watch hundreds of hours of talks and interviews — and the signal scatters across notebooks,
                screenshots, and half-remembered episodes. Founder Mode Advice turns what you study into an organized,
                cloud-accessible library of operating memos you can revisit, export, and share with the people who need
                them.
              </p>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Reveal delay={0}>
                <ValueCard
                  icon={<Layers className="w-4 h-4" />}
                  title="Organized into folders"
                  description="Build a folder for each company or function — Fundraising, GTM, Hiring, Product, Pricing — and file every analysis where it belongs."
                />
              </Reveal>
              <Reveal delay={80}>
                <ValueCard
                  icon={<ScrollText className="w-4 h-4" />}
                  title="Operating memos, not notes"
                  description="Each analysis is a structured brief — executive summary, risks, action items, founder questions — with the source citation behind every line."
                />
              </Reveal>
              <Reveal delay={160}>
                <ValueCard
                  icon={<MessageSquare className="w-4 h-4" />}
                  title="Ask the transcript anything"
                  description="Open a transcript-grounded chat after analysis and pressure-test how the advice applies to your stage, your market, and your next move."
                />
              </Reveal>
              <Reveal delay={240}>
                <ValueCard
                  icon={<ShieldCheck className="w-4 h-4" />}
                  title="Share a single folder"
                  badge="Paid plans"
                  description="Boardroom members can invite teammates or advisors to view specific insights and folders — without exposing the rest of the workspace."
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Use cases — decisions this improves                              */}
        {/* ---------------------------------------------------------------- */}
        <section id="use-cases" className="relative bg-muted/30 py-14 sm:py-20 md:py-28 overflow-hidden scroll-mt-20">
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <Reveal>
                <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">Use cases</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center max-w-3xl mx-auto">
                  Built for the decisions founders{" "}
                  <span className="font-display font-medium italic text-gradient">actually face</span>
                </h2>
              </Reveal>
              <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {USE_CASES.map((u, i) => (
                  <Reveal key={u.title} delay={(i % 3) * 80}>
                    <UseCaseCard {...u} />
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Comparison — passive vs operating leverage                       */}
        {/* ---------------------------------------------------------------- */}
        <section className="container mx-auto px-4 py-14 sm:py-20 md:py-24">
          <div className="max-w-4xl mx-auto space-y-10">
            <Reveal>
              <div className="text-center space-y-3">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                  Watching is passive.{" "}
                  <span className="font-display font-medium italic text-gradient">Operating</span> is the point
                </h2>
                <p className="text-base sm:text-xl text-foreground/85 max-w-2xl mx-auto leading-relaxed">
                  Saved videos, generic summaries, and raw transcripts leave the work to you. Founder Mode Advice does the
                  work — and keeps it.
                </p>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 sm:items-stretch">
              <Reveal delay={0}>
                <div className="glass h-full rounded-2xl p-5 sm:p-6 space-y-3">
                  <h3 className="font-semibold text-lg sm:text-xl text-foreground/85">
                    Bookmarks, summaries &amp; raw transcripts
                  </h3>
                  <ul className="space-y-2 text-base text-foreground/85">
                    <ComparisonItem positive={false}>Passive — the synthesis is still on you</ComparisonItem>
                    <ComparisonItem positive={false}>Generic — the same takeaway for every viewer</ComparisonItem>
                    <ComparisonItem positive={false}>Disposable — scattered and forgotten in a week</ComparisonItem>
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="glass h-full rounded-2xl p-5 sm:p-6 space-y-3 ring-glow border border-primary/30">
                  <h3 className="font-semibold text-lg sm:text-xl text-primary">Founder Mode Advice</h3>
                  <ul className="space-y-2 text-base text-foreground">
                    <ComparisonItem positive>Structured memos — risks, actions, questions</ComparisonItem>
                    <ComparisonItem positive>Tailored to your company, stage, and decision</ComparisonItem>
                    <ComparisonItem positive>Saved into a library that compounds over time</ComparisonItem>
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Positioning / disclaimer                                         */}
        {/* ---------------------------------------------------------------- */}
        <section className="container mx-auto px-4 pb-12 sm:pb-16 md:pb-24">
          <Reveal>
            <div className="max-w-5xl mx-auto glass rounded-3xl p-5 sm:p-8 md:p-10 border-primary/15 shadow-card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 md:items-stretch">
                <div className="space-y-4 flex flex-col">
                  <BadgeLabel>Public Youtube video in. Operating leverage out.</BadgeLabel>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                    You don&apos;t need a boardroom of advisors to{" "}
                    <span className="font-display font-medium italic text-gradient">learn like you have one</span>.
                  </h2>
                  <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">
                    The best founders and operators have shared thousands of hours of hard-won lessons in public
                    interviews, podcasts, and talks. Founder Mode Advice turns that content into structured guidance for
                    your company — without implying affiliation, endorsement, or replacing real advisors.
                  </p>
                </div>
                <div className="space-y-3 flex flex-col">
                  <MiniFeature icon={<ShieldCheck className="w-4 h-4" />} title="Public Youtube video in" description="Paste a founder, investor, operator, strategy, or leadership video from YouTube, Vimeo, LinkedIn, X, or any public podcast or web video URL." />
                  <MiniFeature icon={<Target className="w-4 h-4" />} title="Tailored advice out" description="Insight mapped to your industry, stage, customers, and constraints — not a generic venture-scale playbook." />
                  <MiniFeature icon={<MessageSquare className="w-4 h-4" />} title="Transcript-grounded Q&A" description="Ask follow-up questions directly against the transcript and your company context after analysis." />
                </div>
              </div>
              <p className="mt-6 text-sm text-foreground/70">
                Founder Mode Advice analyzes public content only. It is independent and does not provide private access,
                endorsement, or investment advice from any person or firm referenced in a video.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Pricing                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section id="pricing" className="container mx-auto px-4 py-14 sm:py-20 md:py-28 scroll-mt-20">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center space-y-3 mb-10 sm:mb-14">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                  Pricing that scales with how much you{" "}
                  <span className="font-display font-medium italic text-gradient">operate</span>
                </h2>
                <p className="text-base sm:text-xl text-foreground/85 max-w-2xl mx-auto">
                  Start with a free analysis. Upgrade when your library becomes part of how you run the company.
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
            <p className="mt-6 text-center text-sm text-foreground/70">
              Prices in USD. Web subscriptions are billed via Stripe; in-app subscriptions via the App Store.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* FAQ                                                              */}
        {/* ---------------------------------------------------------------- */}
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

        {/* ---------------------------------------------------------------- */}
        {/* Final CTA                                                         */}
        {/* ---------------------------------------------------------------- */}
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
                  Build your private founder{" "}
                  <span className="font-display font-medium italic">boardroom</span>
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/95">
                  Start with one video. Leave with a company-specific memo, risk map, action list, and a
                  transcript-grounded Q&amp;A you can keep.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Button size="lg" variant="secondary" className="h-12 rounded-full px-7 text-base" onClick={goToAuth}>
                    Analyze a Video <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-primary-foreground/30 bg-transparent px-7 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50 hover:text-primary-foreground"
                    onClick={goToAuth}
                  >
                    Sign In
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

/* ------------------------------------------------------------------------ */
/* Section content                                                          */
/* ------------------------------------------------------------------------ */

const STEPS = [
  {
    step: "01",
    title: "Paste a video",
    description: "Drop in any public founder, investor, or operator video. The source and transcript are pulled automatically.",
  },
  {
    step: "02",
    title: "Add company context",
    description: "Set your stage, industry, model, and the decision you're weighing — or analyze in universal mode.",
  },
  {
    step: "03",
    title: "Generate a memo",
    description: "Get an executive summary, key lessons, risks, action items, and founder questions — each cited to the source.",
  },
  {
    step: "04",
    title: "Save, ask, operationalize",
    description: "File it into a playbook, ask transcript follow-ups, and on Boardroom run one video across multiple business profiles in one go.",
  },
] as const;

const USE_CASES = [
  { title: "Fundraising prep", description: "Walk into the raise with the narrative and metrics investors actually probe." },
  { title: "GTM strategy", description: "Pressure-test your motion before you spend the next quarter committing to it." },
  { title: "Hiring & org design", description: "Learn which roles to hire — and which to delay — from operators who've done it." },
  { title: "Product strategy", description: "Turn product talks into a sharper view of what to build, and what to cut." },
  { title: "Pricing decisions", description: "Borrow pricing logic from operators who've repriced and lived with the result." },
  { title: "Board prep", description: "Turn board-meeting wisdom into a tighter deck and crisper, defensible asks." },
] as const;

const FAQS = [
  {
    q: "What kinds of videos work?",
    a: "Founder interviews, investor talks, operator deep-dives, and strategy lectures — from any public link: YouTube, Vimeo, LinkedIn, X, or a podcast MP3. Private or login-gated posts aren't supported.",
  },
  {
    q: "How is this different from a generic AI summary?",
    a: "Summaries flatten a talk into bullet points. Founder Mode Advice produces a structured operating memo — risks, action items, founder questions — grounded in the transcript and mapped to your company, stage, and decision.",
  },
  {
    q: "Do I need to know who the speaker is?",
    a: "No. Paste any business video and you'll get structured lessons, risks, and action items mapped to your company — even if you've never heard of the person.",
  },
  {
    q: "Is the free plan actually useful?",
    a: "Yes. The free plan includes real analyses every month with the full memo view. Upgrade when you want more volume, more profiles, and the transcript-grounded Q&A.",
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

/* ------------------------------------------------------------------------ */
/* Building blocks                                                          */
/* ------------------------------------------------------------------------ */

const BadgeLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
    {children}
  </div>
);

const ProofCard = ({ index, icon, title, description }: { index: string; icon: React.ReactNode; title: string; description: string }) => (
  <div className="glass elevate-hover relative h-full overflow-hidden rounded-2xl p-6 hover:border-primary/30">
    <div className="flex items-center justify-between">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
        {icon}
      </span>
      <span aria-hidden className="font-display text-2xl font-medium italic text-foreground/10">{index}</span>
    </div>
    <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
    <p className="mt-2 text-sm sm:text-base text-foreground/80 leading-relaxed">{description}</p>
  </div>
);

const StepCard = ({ step, title, description }: { step: string; title: string; description: string }) => (
  <div className="glass elevate-hover relative h-full overflow-hidden rounded-2xl p-5 sm:p-6 hover:border-primary/30">
    <span aria-hidden className="font-display block text-3xl sm:text-4xl font-medium italic leading-none text-primary/25">
      {step}
    </span>
    <h3 className="mt-3 sm:mt-4 font-semibold text-base sm:text-lg">{title}</h3>
    <p className="mt-1 text-sm text-foreground/80 leading-relaxed">{description}</p>
  </div>
);

const UseCaseCard = ({ title, description }: { title: string; description: string }) => (
  <div className="group relative h-full rounded-2xl border border-border bg-card/80 p-5 transition-colors hover:border-primary/30 hover:bg-card">
    <div className="flex items-start gap-3">
      <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <div>
        <h3 className="font-semibold text-base sm:text-lg tracking-tight">{title}</h3>
        <p className="mt-1 text-sm text-foreground/80 leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

const ValueCard = ({ icon, title, description, badge }: { icon: React.ReactNode; title: string; description: string; badge?: string }) => (
  <div className="glass elevate-hover h-full rounded-2xl p-5 sm:p-6 hover:border-primary/30">
    <div className="flex items-center gap-2.5 mb-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">{icon}</span>
      <h3 className="font-semibold text-base sm:text-lg">{title}</h3>
      {badge && (
        <span className="ml-auto shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {badge}
        </span>
      )}
    </div>
    <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">{description}</p>
  </div>
);

const MiniFeature = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="flex-1 rounded-2xl bg-background/70 border border-border p-4 transition-colors hover:border-primary/30">
    <div className="flex items-center gap-2 font-semibold text-base sm:text-lg mb-1">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      {title}
    </div>
    <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">{description}</p>
  </div>
);

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
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${positive ? "text-primary" : "text-foreground/50"}`} />
      <span>{children}</span>
    </li>
  );
};
