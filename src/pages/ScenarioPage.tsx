import { Helmet } from "react-helmet-async";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getScenarioBySlug, SCENARIOS } from "@/lib/content/scenarios";
import { BLOG_POSTS } from "@/lib/content/blog";
import { ArticleShell } from "@/components/marketing/editorial/ArticleShell";
import { ArticleHeader } from "@/components/marketing/editorial/ArticleHeader";
import { EditorialKicker } from "@/components/marketing/editorial/EditorialKicker";
import { RelatedRail } from "@/components/marketing/editorial/RelatedRail";
import { Footer } from "@/components/Footer";
import { LandingNav } from "@/components/marketing/LandingNav";
import { MotionProvider, MReveal } from "@/components/marketing/motion";
import {
  abs,
  articleSchema,
  breadcrumbList,
  faqSchema,
} from "@/lib/content/seoJsonLd";

export default function ScenarioPage() {
  const { slug = "" } = useParams();
  const scenario = getScenarioBySlug(slug);
  const navigate = useNavigate();

  if (!scenario) return <Navigate to="/scenarios" replace />;

  const path = `/scenarios/${scenario.slug}`;
  const canonical = abs(path);

  const jsonLd: unknown[] = [
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Scenarios", path: "/scenarios" },
      { name: scenario.cardTitle, path },
    ]),
    articleSchema({
      headline: scenario.cardTitle,
      description: scenario.cardTagline,
      path,
      datePublished: scenario.datePublished,
      updatedAt: scenario.updatedAt,
    }),
  ];
  if (scenario.faq.length > 0) jsonLd.push(faqSchema(scenario.faq));

  const otherScenarios = SCENARIOS.filter((s) => s.slug !== scenario.slug).slice(0, 3);
  const relatedPost = BLOG_POSTS.find((p) =>
    p.relatedScenarios?.includes(scenario.slug),
  );

  return (
    <MotionProvider>
      <Helmet>
        <title>{scenario.cardTitle} — Founder Mode Advice scenarios</title>
        <meta name="description" content={scenario.cardTagline} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${scenario.cardTitle} — Founder Mode Advice`} />
        <meta property="og:description" content={scenario.cardTagline} />
        <meta property="og:url" content={canonical} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <LandingNav
        onNavigate={(id) => navigate(`/#${id}`)}
        onAuth={() => navigate("/auth")}
        onHome={() => navigate("/")}
      />

      <ArticleShell>
        <ArticleHeader
          kicker={scenario.persona}
          title={scenario.cardTitle}
          dek={scenario.cardTagline}
          crumbs={[
            { name: "Home", to: "/" },
            { name: "Scenarios", to: "/scenarios" },
            { name: scenario.cardTitle },
          ]}
        />

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-14">
            <MReveal>
              <section>
                <EditorialKicker>The stakes</EditorialKicker>
                <p className="mt-5 text-[17px] leading-relaxed text-foreground/85 max-w-2xl">
                  {scenario.stakes}
                </p>
              </section>
            </MReveal>

            <MReveal>
              <section>
                <EditorialKicker>Decisions you'll face</EditorialKicker>
                <ul className="mt-5 divide-y divide-border/60 border-y border-border/60">
                  {scenario.decisionsFaced.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-4 py-4 text-[15.5px] leading-relaxed text-foreground/85"
                    >
                      <span className="mt-1 shrink-0 font-mono text-[11px] tabular-nums text-foreground/40">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </MReveal>

            <MReveal>
              <section>
                <EditorialKicker>The prompt, verbatim</EditorialKicker>
                <div
                  className="mt-5 rounded-2xl panel-hairline p-5 sm:p-6"
                  style={{
                    background:
                      "linear-gradient(180deg, hsl(var(--primary) / 0.06), transparent)",
                  }}
                >
                  <p className="font-mono text-[13.5px] leading-relaxed text-foreground/90">
                    {scenario.sampleAnalysisPrompt}
                  </p>
                </div>
              </section>
            </MReveal>

            <MReveal>
              <section>
                <EditorialKicker>Sample memo output</EditorialKicker>
                <ul className="mt-5 space-y-3">
                  {scenario.sampleMemoBullets.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[15.5px] leading-relaxed text-foreground/85"
                    >
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </MReveal>

            {scenario.faq.length > 0 && (
              <MReveal>
                <section>
                  <EditorialKicker>Frequently asked</EditorialKicker>
                  <dl className="mt-5 space-y-6">
                    {scenario.faq.map((f, i) => (
                      <div key={i}>
                        <dt className="text-[15.5px] font-semibold text-foreground">
                          {f.q}
                        </dt>
                        <dd className="mt-2 text-[15px] leading-relaxed text-foreground/75">
                          {f.a}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </MReveal>
            )}
          </div>

          <aside className="lg:sticky lg:top-28 h-max space-y-8">
            <div className="rounded-2xl panel-hairline p-6">
              <EditorialKicker>Recommended operators</EditorialKicker>
              <ul className="mt-4 space-y-2">
                {scenario.recommendedOperators.map((n) => (
                  <li key={n} className="text-[14.5px] text-foreground/85">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl panel-hairline p-6">
              <p className="text-[15px] leading-relaxed text-foreground/80">
                Ready to run this workflow against a talk on your list?
              </p>
              <Link
                to="/auth"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Analyze a video
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {relatedPost && (
              <Link
                to={`/blog/${relatedPost.slug}`}
                className="group block rounded-2xl panel-hairline p-6 transition-colors hover:border-primary/40"
              >
                <EditorialKicker>From the blog</EditorialKicker>
                <p className="mt-3 text-[15px] font-semibold text-foreground group-hover:text-primary">
                  {relatedPost.h1}
                </p>
              </Link>
            )}
          </aside>
        </div>

        <RelatedRail
          heading="Other scenarios"
          items={otherScenarios.map((s) => ({
            to: `/scenarios/${s.slug}`,
            kicker: s.persona,
            title: s.cardTitle,
            tagline: s.cardTagline,
          }))}
        />
      </ArticleShell>

      <Footer />
    </MotionProvider>
  );
}
