import type { BlogSection } from "@/lib/content/blog";

export const ProseBody = ({ sections }: { sections: BlogSection[] }) => (
  <div className="mt-12 max-w-2xl space-y-6 text-[16.5px] leading-[1.75] text-foreground/85">
    {sections.map((s, i) => {
      switch (s.kind) {
        case "h2":
          return (
            <h2
              key={i}
              className="mt-12 text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-foreground"
            >
              {s.text}
            </h2>
          );
        case "p":
          return <p key={i}>{s.text}</p>;
        case "ul":
          return (
            <ul key={i} className="my-2 space-y-2 pl-5 list-disc marker:text-primary/70">
              {s.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          );
        case "quote":
          return (
            <blockquote
              key={i}
              className="my-8 border-l-2 border-primary/70 pl-5 text-[18px] italic text-foreground/90"
            >
              "{s.text}"
              {s.attribution && (
                <footer className="mt-2 text-[13px] not-italic text-foreground/55">
                  — {s.attribution}
                </footer>
              )}
            </blockquote>
          );
        case "callout":
          return (
            <aside
              key={i}
              className="my-8 rounded-2xl panel-hairline p-5 sm:p-6"
              style={{
                background:
                  "linear-gradient(180deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))",
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                {s.title}
              </p>
              <p className="mt-2 text-[15.5px] leading-relaxed text-foreground/90">
                {s.body}
              </p>
            </aside>
          );
      }
    })}
  </div>
);
