import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { BlogPost } from "@/lib/content/blog";
import { estimateReadingMinutes } from "@/lib/content/readingTime";
import { m, cardChild } from "@/components/marketing/motion";

export const PostCard = ({ post }: { post: BlogPost }) => {
  const minutes = estimateReadingMinutes(post.sections);
  const date = new Date(post.datePublished).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <m.article variants={cardChild} className="h-full">
      <Link
        to={`/blog/${post.slug}`}
        className="group flex h-full flex-col rounded-2xl panel-hairline p-6 sm:p-7 transition-colors hover:border-primary/40"
      >
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-foreground/50">
          {date} · {minutes} min read
        </p>
        <h3 className="mt-4 text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-foreground">
          {post.h1}
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/75">
          {post.excerpt}
        </p>
        <span className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary link-sweep">
          Read the essay
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </Link>
    </m.article>
  );
};
