import { Helmet } from "react-helmet-async";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { BLOG_POSTS, getPostBySlug } from "@/lib/content/blog";
import { SCENARIOS } from "@/lib/content/scenarios";
import { estimateReadingMinutes } from "@/lib/content/readingTime";
import { ArticleShell } from "@/components/marketing/editorial/ArticleShell";
import { ArticleHeader } from "@/components/marketing/editorial/ArticleHeader";
import { ProseBody } from "@/components/marketing/editorial/ProseBody";
import { RelatedRail } from "@/components/marketing/editorial/RelatedRail";
import { Footer } from "@/components/Footer";
import { LandingNav } from "@/components/marketing/LandingNav";
import { MotionProvider } from "@/components/marketing/motion";
import { abs, articleSchema, breadcrumbList } from "@/lib/content/seoJsonLd";

export default function BlogPost() {
  const { slug = "" } = useParams();
  const post = getPostBySlug(slug);
  const navigate = useNavigate();

  if (!post) return <Navigate to="/blog" replace />;

  const path = `/blog/${post.slug}`;
  const canonical = abs(path);
  const minutes = estimateReadingMinutes(post.sections);
  const date = new Date(post.datePublished).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const jsonLd = [
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: post.h1, path },
    ]),
    {
      ...articleSchema({
        headline: post.h1,
        description: post.description,
        path,
        datePublished: post.datePublished,
        updatedAt: post.updatedAt,
      }),
      "@type": "BlogPosting",
    },
  ];

  const relatedScenarios = (post.relatedScenarios ?? [])
    .map((s) => SCENARIOS.find((sc) => sc.slug === s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <MotionProvider>
      <Helmet>
        <title>{post.title}</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={canonical} />
        <meta property="article:published_time" content={post.datePublished} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <LandingNav
        onNavigate={(id) => navigate(`/#${id}`)}
        onAuth={() => navigate("/auth")}
        onHome={() => navigate("/")}
      />

      <ArticleShell>
        <ArticleHeader
          kicker="Essay"
          title={post.h1}
          crumbs={[
            { name: "Home", to: "/" },
            { name: "Blog", to: "/blog" },
            { name: post.h1 },
          ]}
          meta={
            <span className="font-mono uppercase tracking-[0.18em]">
              {date} · {minutes} min read
            </span>
          }
        />

        <ProseBody sections={post.sections} />

        {relatedScenarios.length > 0 && (
          <RelatedRail
            heading="Related scenarios"
            items={relatedScenarios.map((s) => ({
              to: `/scenarios/${s.slug}`,
              kicker: s.persona,
              title: s.cardTitle,
              tagline: s.cardTagline,
            }))}
          />
        )}

        <RelatedRail
          heading="More essays"
          items={relatedPosts.map((p) => ({
            to: `/blog/${p.slug}`,
            kicker: "Essay",
            title: p.h1,
            tagline: p.excerpt,
          }))}
        />
      </ArticleShell>

      <Footer />
    </MotionProvider>
  );
}
