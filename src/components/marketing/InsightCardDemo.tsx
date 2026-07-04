import { Badge } from "@/components/ui/badge";
import { CountUpScore } from "@/components/marketing/CountUpScore";
import type { MontageCard } from "@/components/marketing/montageScript";
import { cn } from "@/lib/utils";

/**
 * One insight card in the hero montage, drawn in the product's real visual
 * language: hairline panel, 3px left accent bar, category badge, ScorePills.
 * Solid background on purpose — these cards animate constantly, so they must
 * not carry a backdrop-filter layer.
 */
export const InsightCardDemo = ({ card, active }: { card: MontageCard; active: boolean }) => (
  <div
    className={cn(
      "montage-card relative rounded-2xl p-4 sm:p-5 pl-5 sm:pl-6 text-left",
      card.tone === "risk" && "border-destructive/40",
    )}
  >
    <div
      aria-hidden
      className={cn(
        "absolute left-0 top-4 bottom-4 w-[3px] rounded-full",
        card.tone === "risk" ? "bg-destructive/70" : "bg-primary/60",
      )}
    />
    <div className="mb-2 flex items-center justify-between gap-2">
      <Badge
        variant="outline"
        className={cn("text-[10px]", card.tone === "risk" && "border-destructive/50 text-destructive")}
      >
        {card.category}
      </Badge>
      <div className="flex gap-1.5">
        {active &&
          card.scores.map((s, i) => (
            <CountUpScore key={s.label} label={s.label} value={s.value} delay={0.2 + i * 0.12} />
          ))}
      </div>
    </div>
    <p className="text-sm sm:text-[15px] leading-relaxed text-foreground">{card.text}</p>
  </div>
);
