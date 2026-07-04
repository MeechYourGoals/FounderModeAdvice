import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SCENARIOS } from "@/lib/content/scenarios";
import { ArticleShell } from "@/components/marketing/editorial/ArticleShell";
import { ArticleHeader } from "@/components/marketing/editorial/ArticleHeader";
import { ScenarioCard } from "@/components/marketing/editorial/ScenarioCard";
import { Footer } from "@/components/Footer";
import { LandingNav } from "@/components/marketing/LandingNav";
import {
  MotionProvider,
  m,
  staggerParent,
  VIEWPORT_ONCE,
} from "@/components/marketing/motion";
import { abs, breadcrumbList, itemList } from "@/lib/content/seoJsonLd";

const CANONICAL = abs("/scenarios");

export default function ScenariosHub() {
  const navigate = useNavigate();
  const jsonLd = [
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Scenarios", path: "/scenarios" },
    ]),
    itemList(
      SCENARIOS.map((s) => ({
        name: s.cardTitle,
        path: `/scenarios/${s.slug}`,
        description: s.cardTagline,
      })),
    ),
  ];

  return (
    <MotionProvider>
      <Helmet>
        <title>Scenarios — who Founder Mode Advice is for</title>
        <meta
          name="description"
          content="Eight founder scenarios — from YC batch to Fortune 500 downsizing — with the exact decisions, prompts, and operator libraries that make Founder Mode Advice worth an afternoon."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Scenarios — who Founder Mode Advice is for" />
        <meta property="og:url" content={CANONICAL} />
        <meta
          property="og:description"
          content="Eight founder scenarios with the exact decisions, prompts, and operator libraries."
        />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <LandingNav
        onNavigate={(id) => navigate(`/#${id}`)}
        onAuth={() => navigate("/auth")}
        onHome={() => navigate("/")}
      />

      <ArticleShell>
        <ArticleHeader
          kicker="Scenarios"
          title="Who Founder Mode Advice is actually for."
          dek="Eight persona-shaped workflows — from a Y Combinator batch to a Fortune 500 reduction — with the exact decisions, prompts, and operator libraries that make the tool worth an afternoon."
          crumbs={[
            { name: "Home", to: "/" },
            { name: "Scenarios" },
          ]}
        />

        <m.div
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerParent(0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
        >
          {SCENARIOS.map((s) => (
            <ScenarioCard key={s.slug} scenario={s} />
          ))}
        </m.div>

        <div className="mt-20 flex flex-col items-start gap-4 border-t border-border/60 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[15px] leading-relaxed text-foreground/70">
            Don't see your exact seat? The workflow is agnostic — the tool adapts to your profile, not the other way around.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Analyze a video
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </ArticleShell>

      <Footer />
    </MotionProvider>
  );
}
