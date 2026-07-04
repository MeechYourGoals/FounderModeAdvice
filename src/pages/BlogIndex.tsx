import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { BLOG_POSTS } from "@/lib/content/blog";
import { ArticleShell } from "@/components/marketing/editorial/ArticleShell";
import { ArticleHeader } from "@/components/marketing/editorial/ArticleHeader";
import { PostCard } from "@/components/marketing/editorial/PostCard";
import { Footer } from "@/components/Footer";
import { LandingNav } from "@/components/marketing/LandingNav";
import {
  MotionProvider,
  m,
  staggerParent,
  VIEWPORT_ONCE,
} from "@/components/marketing/motion";
import { abs, breadcrumbList, itemList } from "@/lib/content/seoJsonLd";

const CANONICAL = abs("/blog");

export default function BlogIndex() {
  const navigate = useNavigate();
  const jsonLd = [
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
    ]),
    itemList(
      BLOG_POSTS.map((p) => ({
        name: p.h1,
        path: `/blog/${p.slug}`,
        description: p.excerpt,
      })),
    ),
  ];

  return (
    <MotionProvider>
      <Helmet>
        <title>Blog — Founder Mode Advice</title>
        <meta
          name="description"
          content="Essays on turning founder and operator videos into decision memos. Long-form guidance for founders, operators, and boards."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Blog — Founder Mode Advice" />
        <meta property="og:url" content={CANONICAL} />
        <meta
          property="og:description"
          content="Essays on turning founder and operator videos into decision memos."
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
          kicker="Blog"
          title="Notes on running the operator library."
          dek="Long-form essays on turning founder and operator talks into decision memos — for the weeks when the general instinct is not enough."
          crumbs={[
            { name: "Home", to: "/" },
            { name: "Blog" },
          ]}
        />

        <m.div
          className="mt-16 grid gap-5 sm:grid-cols-2"
          variants={staggerParent(0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
        >
          {BLOG_POSTS.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </m.div>
      </ArticleShell>

      <Footer />
    </MotionProvider>
  );
}
