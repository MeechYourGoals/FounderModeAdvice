import { useEffect, useState } from "react";
import { AtSign } from "lucide-react";
import { m, SPRING_POP } from "@/components/marketing/motion";
import { MONTAGE_COMMENT } from "@/components/marketing/montageScript";

/**
 * Teammate comment bubble for the hero montage — typing dots resolve into
 * the comment text with an @mention chip, mirroring the InsightComments
 * visual language from the product.
 */
export const CommentPop = () => {
  const [typed, setTyped] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTyped(true), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <m.div
      className="montage-card rounded-2xl rounded-tr-sm px-3.5 py-3 max-w-[290px] shadow-lg"
      initial={{ opacity: 0, scale: 0.7, y: 12, originX: 1, originY: 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={SPRING_POP}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
          {MONTAGE_COMMENT.author}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">Teammate</span>
      </div>
      <div className="mt-1.5 min-h-[2.25rem]">
        {typed ? (
          <m.p
            className="text-xs leading-relaxed text-foreground/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {MONTAGE_COMMENT.text}{" "}
            <m.span
              className="inline-flex translate-y-[1px] items-center gap-0.5 rounded-full bg-primary/12 px-1.5 py-px text-[10px] font-medium text-primary"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SPRING_POP, delay: 0.15 }}
            >
              <AtSign className="h-2.5 w-2.5" />
              {MONTAGE_COMMENT.mention.slice(1)}
            </m.span>
          </m.p>
        ) : (
          <div className="flex items-center gap-1 pt-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <m.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}
      </div>
    </m.div>
  );
};
