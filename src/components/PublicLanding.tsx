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
import { HeroTranscriptMemo } from "@/components/marketing/HeroTranscriptMemo";
import { SectionShell } from "@/components/marketing/SectionShell";
import { UseCasesList } from "@/components/marketing/UseCasesList";
import { Reveal } from "@/hooks/useReveal";
import { TIER_PRICING, type SubscriptionTier } from "@/types/subscription";

/**
 * PublicLanding — Founder Mode Advice marketing surface.
 *
 * Composition is intentionally *not* the generic "left-copy + right-dashboard-
 * card" pattern used by most Lovable-generated SaaS landings. Instead:
 *   1. A scroll-driven Transcript → Memo hero (`HeroTranscriptMemo`) that
 *      shows the product's core transformation as the primary visual.
 *   2. Section rhythm handled by `SectionShell` (eyebrow → title → lead) with
 *      an animated 1px divider on every section, so the page reads editorial
 *      rather than card-grid heavy.
 *   3. A restored, first-class "Use cases" section rendered as an editorial
 *      list (`UseCasesList`) instead of a small 3-across card grid that was
 *      previously invisible against the surrounding sections.
 */

const NAV_LINKS = [
  { label: "Product", target: "product" },
  { label: "Use cases", target: "use-cases" },
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
    <div className="h-screen flex flex-col bg-background">
      {/* Nav — hairline, no shadow. Distinct from the SeatMap-style nav bar. */}
      <nav
        className="relative z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl"
        style={{ paddingTop: "var(--safe-area-top)" }}
      >
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Founder Mode Advice — home"
          >
            <BrandLogo className="h-9 sm:h-11 w-auto" />
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            {NAV_LINKS.map((link) => (
              <Button
                key={link.target}
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex rounded-full text-foreground/70 hover:text-foreground link-sweep"
                onClick={() => scrollTo(link.target)}
              >
                {link.label}
              </Button>
            ))}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex rounded-full"
              onClick={goToAuth}
            >
              Sign In
            </Button>
            <Button size="sm" className="rounded-full px-4" onClick={goToAuth}>
              <span className="sm:hidden">Sign In</span>
              <span className="hidden sm:inline">Analyze a video</span>
              <ArrowRight className="ml-1.5 h-4 w-4 hidden sm:inline-block" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Scrollable content (Despia pattern) */}
      <div className="despia-scroll">
        {/* Signature hero — scroll-driven transformation */}
        <HeroTranscriptMemo onPrimary={goToAuth} onSecondary={() => scrollTo("use-cases")} />

        {/* Product truth */}
        <SectionShell
          id="product"
          eyebrow="Why it's different"
          title="Not another AI summary. A source-grounded operating system."
          align="center"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Reveal>
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
        </SectionShell>

        {/* How it works */}
        <SectionShell
          eyebrow="How it works"
          title="From transcript to operating memo in minutes."
          lead="Paste a founder talk, investor interview, operator breakdown, or strategy lecture. Add your company context. Get structured intelligence you can act on."
        >
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {STEPS.map((s, i) => (
              <Reveal key={s.step} delay={i * 90}>
                <StepCard {...s} />
              </Reveal>
            ))}
          </ol>
        </SectionShell>

        {/* Interactive sample demo (existing component) */}
        <div id="demo">
          <SampleDemo />
        </div>

        {/* Library story */}
        <SectionShell
          eyebrow="Your founder library"
          title="A private boardroom that compounds, not a feed you forget."
          lead="Founders watch hundreds of hours of talks and interviews — and the signal scatters across notebooks, screenshots, and half-remembered episodes. Founder Mode Advice turns what you study into an organized library of operating memos you can revisit, export, and share."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Reveal>
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
        </SectionShell>

        {/* Use cases — now a first-class editorial section (was previously the
            "missing" 3-across card grid that visually collapsed). */}
        <SectionShell id="use-cases">
          <UseCasesList onSelect={goToAuth} />
        </SectionShell>

        {/* Comparison */}
        <SectionShell
          title="Watching is passive. Operating is the point."
          lead="Saved videos, generic summaries, and raw transcripts leave the work to you. Founder Mode Advice does the work — and keeps it."
          align="center"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:items-stretch max-w-4xl mx-auto">
            <Reveal>
              <div className="panel-hairline h-full rounded-2xl p-6 space-y-3">
                <h3 className="font-semibold text-lg sm:text-xl text-foreground/70">
                  Bookmarks, summaries &amp; raw transcripts
                </h3>
                <ul className="space-y-2 text-[15px] text-foreground/80">
                  <ComparisonItem positive={false}>Passive — the synthesis is still on you</ComparisonItem>
                  <ComparisonItem positive={false}>Generic — the same takeaway for every viewer</ComparisonItem>
                  <ComparisonItem positive={false}>Disposable — scattered and forgotten in a week</ComparisonItem>
                </ul>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="panel-hairline h-full rounded-2xl p-6 space-y-3 border-primary/30 ring-1 ring-primary/20">
                <h3 className="font-semibold text-lg sm:text-xl text-primary">Founder Mode Advice</h3>
                <ul className="space-y-2 text-[15px] text-foreground">
                  <ComparisonItem positive>Structured memos — risks, actions, questions</ComparisonItem>
                  <ComparisonItem positive>Tailored to your company, stage, and decision</ComparisonItem>
                  <ComparisonItem positive>Saved into a library that compounds over time</ComparisonItem>
                </ul>
              </div>
            </Reveal>
          </div>
        </SectionShell>

        {/* Positioning / disclaimer */}
        <SectionShell>
          <Reveal>
            <div className="panel-hairline max-w-5xl mx-auto rounded-3xl p-6 sm:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-4">
                  <BadgeLabel>Public video in. Operating leverage out.</BadgeLabel>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[-0.02em]">
                    You don&apos;t need a boardroom of advisors to learn like you have one.
                  </h2>
                  <p className="text-[15px] sm:text-[17px] leading-relaxed text-foreground/85">
                    The best founders and operators have shared thousands of hours of hard-won lessons in public
                    interviews, podcasts, and talks. Founder Mode Advice turns that content into structured
                    guidance for your company — without implying affiliation, endorsement, or replacing real
                    advisors.
                  </p>
                </div>
                <div className="space-y-3">
                  <MiniFeature
                    icon={<ShieldCheck className="w-4 h-4" />}
                    title="Public video in"
                    description="Paste a founder, investor, operator, strategy, or leadership video from YouTube, Vimeo, LinkedIn, X, or any public podcast or web video URL."
                  />
                  <MiniFeature
                    icon={<Target className="w-4 h-4" />}
                    title="Tailored advice out"
                    description="Insight mapped to your industry, stage, customers, and constraints — not a generic venture-scale playbook."
                  />
                  <MiniFeature
                    icon={<MessageSquare className="w-4 h-4" />}
                    title="Transcript-grounded Q&A"
                    description="Ask follow-up questions directly against the transcript and your company context after analysis."
                  />
                </div>
              </div>
              <p className="mt-6 text-sm text-foreground/65">
                Founder Mode Advice analyzes public content only. It is independent and does not provide private
                access, endorsement, or investment advice from any person or firm referenced in a video.
              </p>
            </div>
          </Reveal>
        </SectionShell>

        {/* Pricing */}
        <SectionShell
          id="pricing"
          eyebrow="Pricing"
          title="Pricing that scales with how much you operate."
          lead="Start with a free analysis. Upgrade when your library becomes part of how you run the company."
          align="center"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-stretch max-w-5xl mx-auto">
            {(Object.keys(TIER_PRICING) as SubscriptionTier[]).map((key, i) => (
              <Reveal key={key} delay={i * 100}>
                <PricingCard tier={key} onSelect={goToAuth} />
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-foreground/65">
            Prices in USD. Web subscriptions are billed via Stripe; in-app subscriptions via the App Store.
          </p>
        </SectionShell>

        {/* FAQ */}
        <SectionShell eyebrow="FAQ" title="Common questions.">
          <div className="grid gap-4 md:grid-cols-2">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={(i % 2) * 80}>
                <Card className="h-full bg-card/95 elevate-hover">
                  <CardContent className="p-5">
                    <h3 className="text-lg font-semibold">{f.q}</h3>
                    <p className="mt-2 text-[15px] text-foreground/85 leading-relaxed">{f.a}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </SectionShell>

        {/* Final CTA */}
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
                <h2 className="text-3xl font-semibold tracking-[-0.025em] sm:text-5xl">
                  Build your private founder boardroom.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/95">
                  Start with one video. Leave with a company-specific memo, risk map, action list, and a
                  transcript-grounded Q&amp;A you can keep.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-12 rounded-full px-7 text-base"
                    onClick={goToAuth}
                  >
                    Analyze a video <ArrowRight className="ml-2 h-4 w-4" />
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
    description:
      "Drop in any public founder, investor, or operator video. The source and transcript are pulled automatically.",
  },
  {
    step: "02",
    title: "Add company context",
    description:
      "Set your stage, industry, model, and the decision you're weighing — or analyze in universal mode.",
  },
  {
    step: "03",
    title: "Generate a memo",
    description:
      "Get an executive summary, key lessons, risks, action items, and founder questions — each cited to the source.",
  },
  {
    step: "04",
    title: "Save, ask, operationalize",
    description:
      "File it into a playbook, ask transcript follow-ups, and on Boardroom run one video across multiple business profiles in one go.",
  },
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
  <div className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
    {children}
  </div>
);

const ProofCard = ({
  index,
  icon,
  title,
  description,
}: {
  index: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="panel-hairline card-lift relative h-full overflow-hidden rounded-2xl p-6">
    <div className="flex items-center justify-between">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
        {icon}
      </span>
      <span aria-hidden className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/40 tabular-nums">
        {index}
      </span>
    </div>
    <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
    <p className="mt-2 text-[15px] text-foreground/80 leading-relaxed">{description}</p>
  </div>
);

const StepCard = ({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) => (
  <li className="panel-hairline card-lift relative h-full overflow-hidden rounded-2xl p-6 list-none">
    <span aria-hidden className="block font-mono text-[11px] uppercase tracking-[0.22em] text-primary/80 tabular-nums">
      {step}
    </span>
    <h3 className="mt-3 font-semibold text-lg tracking-tight">{title}</h3>
    <p className="mt-1.5 text-[14.5px] text-foreground/80 leading-relaxed">{description}</p>
  </li>
);

const ValueCard = ({
  icon,
  title,
  description,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) => (
  <div className="panel-hairline card-lift h-full rounded-2xl p-6">
    <div className="flex items-center gap-2.5 mb-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
        {icon}
      </span>
      <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
      {badge && (
        <span className="ml-auto shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {badge}
        </span>
      )}
    </div>
    <p className="text-[15px] text-foreground/80 leading-relaxed">{description}</p>
  </div>
);

const MiniFeature = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="rounded-2xl bg-background/60 border border-border/70 p-4 transition-colors hover:border-primary/30">
    <div className="flex items-center gap-2 font-semibold text-base sm:text-lg mb-1">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      {title}
    </div>
    <p className="text-[14.5px] text-foreground/80 leading-relaxed">{description}</p>
  </div>
);

const PricingCard = ({
  tier,
  onSelect,
}: {
  tier: SubscriptionTier;
  onSelect: () => void;
}) => {
  const plan = TIER_PRICING[tier];
  const isFree = tier === "free";
  return (
    <div
      className={`relative panel-hairline card-lift h-full rounded-2xl p-6 flex flex-col ${
        plan.recommended ? "ring-1 ring-primary/50 border-primary/40 md:scale-[1.03]" : ""
      }`}
    >
      {plan.recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-md">
          Most Popular
        </span>
      )}
      <h3 className="text-xl font-bold">{plan.displayName}</h3>
      <div className="mt-2 mb-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight">
          {isFree ? "Free" : `$${plan.price}`}
        </span>
        {!isFree && <span className="text-base text-foreground/80">/month</span>}
      </div>
      <ul className="space-y-2.5 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-[15px]">
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

const ComparisonItem = ({
  positive,
  children,
}: {
  positive: boolean;
  children: React.ReactNode;
}) => {
  const Icon = positive ? Check : X;
  return (
    <li className="flex items-start gap-2">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${positive ? "text-primary" : "text-foreground/50"}`} />
      <span>{children}</span>
    </li>
  );
};
