import { useRef } from "react";
import {
  ArrowRight,
  Check,
  FolderOpen,
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
import { Footer } from "@/components/Footer";
import { SampleDemo } from "@/components/marketing/SampleDemo";
import { SectionShell } from "@/components/marketing/SectionShell";
import { UseCasesList } from "@/components/marketing/UseCasesList";
import { ScenarioCard } from "@/components/marketing/editorial/ScenarioCard";
import { Link } from "react-router-dom";
import { FEATURED_SCENARIO_SLUGS, SCENARIOS } from "@/lib/content/scenarios";
import { LandingNav } from "@/components/marketing/LandingNav";
import { AuroraBackground } from "@/components/marketing/AuroraBackground";
import { ScrollProgress } from "@/components/marketing/ScrollProgress";
import { LandingHero } from "@/components/marketing/LandingHero";
import { HowItWorksRail } from "@/components/marketing/HowItWorksRail";
import { TiltCard } from "@/components/marketing/TiltCard";
import {
  m,
  MotionProvider,
  LandingScrollContext,
  staggerParent,
  cardChild,
  riseChild,
  scaleIn,
  SPRING_POP,
  SPRING_SOFT,
  EASE_IOS,
  VIEWPORT_ONCE,
  type Variants,
} from "@/components/marketing/motion";
import { TIER_PRICING, type SubscriptionTier } from "@/types/subscription";

/**
 * PublicLanding — Founder Mode Advice marketing surface.
 *
 * "iOS 27" motion redesign: a centered floating capsule nav, a living aurora
 * background, an auto-playing insight-montage hero (`LandingHero`), and
 * spring-choreographed section entrances driven by the `motion` library
 * (loaded only with this page's async chunk). The page scrolls inside the
 * `.despia-scroll` container — every scroll-linked hook reads it through
 * `LandingScrollContext`.
 */

/** Icon chip pop used inside staggered cards (fires slightly after its card). */
const iconPop: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: { ...SPRING_POP, delay: 0.15 } },
};

const faqChild: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_IOS } },
};

export const PublicLanding = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Landing CTAs are acquisition intent — land on the Sign Up tab, not Sign In.
  const goToAuth = () => navigate("/auth?mode=signup");
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <MotionProvider>
      <LandingScrollContext.Provider value={scrollRef}>
        <div className="h-screen flex flex-col bg-background">
          <ScrollProgress />
          <LandingNav onNavigate={scrollTo} onAuth={goToAuth} onSignIn={() => navigate("/auth")} onHome={scrollToTop} />

          {/* Scrollable content (Despia pattern) */}
          <div ref={scrollRef} className="despia-scroll relative">
            <AuroraBackground />

            <div className="relative z-10">
              {/* Signature hero — auto-playing insight montage */}
              <LandingHero onPrimary={goToAuth} onSecondary={() => scrollTo("demo")} />

              {/* Product truth */}
              <SectionShell
                id="product"
                eyebrow="Why it's different"
                title="Not just another AI note summary. A digital advisory council of your chosen experts."
                align="center"
                aura
              >
                <m.div
                  className="grid grid-cols-1 md:grid-cols-3 gap-5"
                  variants={staggerParent(0.12)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={VIEWPORT_ONCE}
                >
                  <m.div variants={cardChild}>
                    <TiltCard className="h-full">
                      <ProofCard
                        index="01"
                        icon={<ShieldCheck className="h-4 w-4" />}
                        title="Transcript-grounded"
                        description="Every lesson, risk, and recommendation ties back to what was actually said — with timecoded citations you can verify."
                      />
                    </TiltCard>
                  </m.div>
                  <m.div variants={cardChild}>
                    <TiltCard className="h-full">
                      <ProofCard
                        index="02"
                        icon={<Target className="h-4 w-4" />}
                        title="Your Company-specific"
                        description="Output adapts to your stage, industry, business model, and the decision in front of you — not generic venture-scale platitudes."
                      />
                    </TiltCard>
                  </m.div>
                  <m.div variants={cardChild}>
                    <TiltCard className="h-full">
                      <ProofCard
                        index="03"
                        icon={<Layers className="h-4 w-4" />}
                        title="Built into a library"
                        description="Save analyses into folders so insight compounds over time, instead of scattering across notebooks, apps, and screenshots."
                      />
                    </TiltCard>
                  </m.div>
                </m.div>
              </SectionShell>

              {/* How it works */}
              <SectionShell
                eyebrow="How it works"
                title="From source to operating memo in minutes."
                lead="Paste almost any public link — an article, post, newsletter, video, or podcast. Add your company context. Get structured intelligence you can act on."
              >
                <HowItWorksRail />
              </SectionShell>

              {/* Interactive sample demo (owns its #demo anchor) */}
              <SampleDemo />

              {/* Founder library */}
              <SectionShell
                eyebrow="Your founder library"
                title="A private boardroom that compounds, not a feed you forget."
                lead="Founders read and watch hundreds of hours of talks, interviews, essays, and posts — and the signal scatters across notebooks, screenshots, and half-remembered episodes. Founder Mode Advice turns what you study into an organized library of operating memos you can revisit, export, and share."
              >
                <m.div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-5"
                  variants={staggerParent(0.09)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={VIEWPORT_ONCE}
                >
                  <m.div variants={cardChild}>
                    <ValueCard
                      icon={<Layers className="w-4 h-4" />}
                      title="Organized into folders"
                      description="Build a folder for each company or function — Fundraising, GTM, Hiring, Product, Pricing — and file analyses by hand on Free and The C-Suite."
                    />
                  </m.div>
                  <m.div variants={cardChild}>
                    <ValueCard
                      icon={<ScrollText className="w-4 h-4" />}
                      title="Operating memos, not notes"
                      description="Each analysis is a structured brief — executive summary, risks, action items, founder questions — with the source citation behind every line."
                    />
                  </m.div>
                  <m.div variants={cardChild}>
                    <ValueCard
                      icon={<MessageSquare className="w-4 h-4" />}
                      title="Ask the transcript anything"
                      description="Open a transcript-grounded chat after analysis and pressure-test how the advice applies to your stage, your market, and your next move."
                    />
                  </m.div>
                  <m.div variants={cardChild}>
                    <ValueCard
                      icon={<ShieldCheck className="w-4 h-4" />}
                      title="Collaborate with your team"
                      badge="Boardroom"
                      description="Invite teammates or advisors to a single analysis or a whole folder. They can add notes, comment on individual insights, and tag each other — without seeing the rest of your workspace."
                    />
                  </m.div>
                  <m.div variants={cardChild} className="sm:col-span-2">
                    <ValueCard
                      icon={<FolderOpen className="w-4 h-4" />}
                      title="Smart tag folders"
                      badge="Boardroom"
                      description="Dozens of analyses, zero drag-and-drop. Long-press a Marketing or Operations tag to create a folder, file every matching memo you already have, and auto-file new videos, articles, and uploads that get that tag."
                    />
                  </m.div>
                </m.div>
              </SectionShell>

              {/* Use cases — first-class editorial section */}
              <SectionShell id="use-cases">
                <UseCasesList onSelect={goToAuth} />
              </SectionShell>

              {/* Scenarios — persona-shaped entry points to /scenarios */}
              <SectionShell
                id="scenarios"
                eyebrow="Scenarios"
                title="Who this is actually for."
                lead="Persona-shaped workflows with the exact decisions, prompts, and operator libraries — from a YC batch founder searching for product market fit to a Fortune 500 CEO navigating layoffs."
              >
                <m.div
                  className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                  variants={staggerParent(0.06)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={VIEWPORT_ONCE}
                >
                  {FEATURED_SCENARIO_SLUGS.map((slug) => {
                    const s = SCENARIOS.find((x) => x.slug === slug)!;
                    return <ScenarioCard key={slug} scenario={s} />;
                  })}
                </m.div>
                <div className="mt-10 flex justify-center">
                  <Link
                    to="/scenarios"
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-medium text-foreground/85 hover:border-primary/40 hover:text-foreground link-sweep"
                  >
                    See all {SCENARIOS.length} scenarios
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </SectionShell>

              {/* Comparison */}
              <SectionShell
                title="Watching is passive. Operating is the point."
                lead="Saved links, generic summaries, and raw transcripts leave the work to you. Founder Mode Advice does the work — and keeps it."
                align="center"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:items-stretch max-w-4xl mx-auto">
                  <m.div
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ duration: 0.7, ease: EASE_IOS }}
                  >
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
                  </m.div>
                  <m.div
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ duration: 0.7, ease: EASE_IOS, delay: 0.12 }}
                  >
                    <div className="panel-hairline h-full rounded-2xl p-6 space-y-3 border-primary/30 ring-1 ring-primary/20">
                      <h3 className="font-semibold text-lg sm:text-xl text-primary">Founder Mode Advice</h3>
                      <ul className="space-y-2 text-[15px] text-foreground">
                        <ComparisonItem positive>Structured memos — risks, actions, questions</ComparisonItem>
                        <ComparisonItem positive>Tailored to your company, stage, and decision</ComparisonItem>
                        <ComparisonItem positive>Saved into a library that compounds over time</ComparisonItem>
                      </ul>
                    </div>
                  </m.div>
                </div>
              </SectionShell>

              {/* Positioning / disclaimer */}
              <SectionShell>
                <m.div
                  variants={scaleIn()}
                  initial="hidden"
                  whileInView="visible"
                  viewport={VIEWPORT_ONCE}
                >
                  <div className="panel-hairline max-w-5xl mx-auto rounded-3xl p-6 sm:p-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                      <div className="space-y-4">
                        <BadgeLabel>Any public link in. Operating leverage out.</BadgeLabel>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[-0.02em]">
                          You don&apos;t need a boardroom of advisors to learn like you have one.
                        </h2>
                        <p className="text-[15px] sm:text-[17px] leading-relaxed text-foreground/85">
                          The best founders and operators have shared thousands of hours of hard-won lessons in public
                          interviews, podcasts, talks, essays, and posts. Founder Mode Advice turns that content into
                          structured guidance for your company — without implying affiliation, endorsement, or replacing
                          real advisors.
                        </p>
                      </div>
                      <m.div
                        className="space-y-3"
                        variants={staggerParent(0.1)}
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                      >
                        <m.div variants={riseChild}>
                          <MiniFeature
                            icon={<ShieldCheck className="w-4 h-4" />}
                            title="Any public link in"
                            description="Paste almost any public link — an article, post, newsletter, or podcast, or a founder, investor, operator, or leadership video from YouTube, TikTok, Instagram Reels, X, Vimeo, or LinkedIn."
                          />
                        </m.div>
                        <m.div variants={riseChild}>
                          <MiniFeature
                            icon={<Target className="w-4 h-4" />}
                            title="Tailored advice out"
                            description="Insight mapped to your industry, stage, customers, and constraints — not a generic venture-scale playbook."
                          />
                        </m.div>
                        <m.div variants={riseChild}>
                          <MiniFeature
                            icon={<MessageSquare className="w-4 h-4" />}
                            title="Transcript-grounded Q&A"
                            description="Ask follow-up questions directly against the transcript and your company context after analysis."
                          />
                        </m.div>
                      </m.div>
                    </div>
                    <p className="mt-6 text-sm text-foreground/65">
                      Founder Mode Advice analyzes public content only. It is independent and does not provide private
                      access, endorsement, or investment advice from any person or firm referenced in the content.
                    </p>
                  </div>
                </m.div>
              </SectionShell>

              {/* Pricing */}
              <SectionShell
                id="pricing"
                eyebrow="Pricing"
                title="Start free. Upgrade when it runs your week."
                lead="Start with a free analysis. Upgrade when your library becomes part of how you run the company."
                align="center"
                aura
              >
                <m.div
                  className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-stretch max-w-5xl mx-auto"
                  variants={staggerParent(0.1)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={VIEWPORT_ONCE}
                >
                  {(Object.keys(TIER_PRICING) as SubscriptionTier[]).map((key) => (
                    <m.div
                      key={key}
                      variants={cardChild}
                      whileHover={{ y: -6 }}
                      transition={SPRING_SOFT}
                      className="h-full"
                    >
                      <PricingCard tier={key} onSelect={goToAuth} />
                    </m.div>
                  ))}
                </m.div>
                <p className="mt-6 text-center text-sm text-foreground/65">
                  Prices in USD. Web subscriptions are billed via Stripe; in-app subscriptions via the App Store.
                </p>
              </SectionShell>

              {/* FAQ */}
              <SectionShell eyebrow="FAQ" title="Common questions.">
                <m.div
                  className="grid gap-4 md:grid-cols-2"
                  variants={staggerParent(0.05)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                >
                  {FAQS.map((f) => (
                    <m.div key={f.q} variants={faqChild}>
                      <Card className="h-full bg-card/95 elevate-hover">
                        <CardContent className="p-5">
                          <h3 className="text-lg font-semibold">{f.q}</h3>
                          <p className="mt-2 text-[15px] text-foreground/85 leading-relaxed">{f.a}</p>
                        </CardContent>
                      </Card>
                    </m.div>
                  ))}
                </m.div>
              </SectionShell>

              {/* Final CTA */}
              <section className="container mx-auto px-4 pb-16 sm:pb-24">
                <m.div
                  variants={scaleIn()}
                  initial="hidden"
                  whileInView="visible"
                  viewport={VIEWPORT_ONCE}
                >
                  <div className="grain relative max-w-5xl mx-auto overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-elegant sm:px-12 sm:py-16">
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(80% 100% at 20% 0%, hsl(199 90% 60% / 0.5), transparent 60%), radial-gradient(70% 90% at 90% 100%, hsl(224 90% 50% / 0.45), transparent 60%)",
                      }}
                    />
                    <div aria-hidden className="cta-aurora" />
                    <div className="relative">
                      <h2 className="text-3xl font-semibold tracking-[-0.025em] sm:text-5xl">
                        Build your private founder boardroom.
                      </h2>
                      <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/95">
                        Start with one source. Leave with a company-specific memo, risk map, action list, and a
                        transcript-grounded Q&amp;A you can keep.
                      </p>
                      <div className="mt-7 flex flex-wrap justify-center gap-3">
                        <m.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} transition={SPRING_POP}>
                          <Button
                            size="lg"
                            variant="secondary"
                            className="h-12 rounded-full px-7 text-base"
                            onClick={goToAuth}
                          >
                            Analyze a source <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </m.div>
                        <m.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} transition={SPRING_POP}>
                          <Button
                            size="lg"
                            variant="outline"
                            className="h-12 rounded-full border-primary-foreground/30 bg-transparent px-7 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50 hover:text-primary-foreground"
                            onClick={goToAuth}
                          >
                            Sign In
                          </Button>
                        </m.div>
                      </div>
                    </div>
                  </div>
                </m.div>
              </section>

              <Footer showAppStoreBadge />
            </div>
          </div>
        </div>
      </LandingScrollContext.Provider>
    </MotionProvider>
  );
};

/* ------------------------------------------------------------------------ */
/* Section content                                                          */
/* ------------------------------------------------------------------------ */

const FAQS = [
  {
    q: "What can I analyze?",
    a: "Almost any public URL — articles, blogs, Substack posts, LinkedIn or X posts, newsletters, and videos or podcasts from YouTube, TikTok, Instagram Reels, Vimeo, or a podcast MP3. Paid tiers can also upload private documents (PDF, TXT, Markdown, CSV, DOCX, and images). Private or login-gated posts aren't supported.",
  },
  {
    q: "How is this different from a generic AI summary?",
    a: "Summaries flatten a talk into bullet points. Founder Mode Advice produces a structured operating memo — risks, action items, founder questions — grounded in the transcript and mapped to your company, stage, and decision.",
  },
  {
    q: "Do I need to know who the speaker is?",
    a: "No. Paste almost any public link and you'll get structured lessons, risks, and action items mapped to your company — even if you've never heard of the person.",
  },
  {
    q: "Is the free plan actually useful?",
    a: "Yes. The free plan includes 3 full analyses every month with the complete memo view. Upgrade when you want more volume, more profiles, and the transcript-grounded Q&A.",
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
      <m.span
        variants={iconPop}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15"
      >
        {icon}
      </m.span>
      <span aria-hidden className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/40 tabular-nums">
        {index}
      </span>
    </div>
    <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
    <p className="mt-2 text-[15px] text-foreground/80 leading-relaxed">{description}</p>
  </div>
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
      <m.span
        variants={iconPop}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15"
      >
        {icon}
      </m.span>
      <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
      {badge && (
        <m.span
          variants={iconPop}
          className="ml-auto shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
        >
          {badge}
        </m.span>
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
      className={`relative panel-hairline h-full rounded-2xl p-6 flex flex-col ${
        plan.recommended ? "ring-1 ring-primary/50 border-primary/40 md:scale-[1.03]" : ""
      }`}
    >
      {plan.recommended && (
        <m.span
          variants={iconPop}
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-md"
        >
          Most Popular
        </m.span>
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
