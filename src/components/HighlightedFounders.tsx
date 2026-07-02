import { Lightbulb } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HIGHLIGHTED_FOUNDERS } from "@/lib/highlightedFounders";

/**
 * Inspiration block for the empty-library state. Lists widely-known founders by
 * decade so a new user knows who to search for on YouTube to analyze first.
 * Intentionally text-only and non-interactive (no photos, logos, or links) — it's
 * a discovery aid, not an endorsement. Names live in @/lib/highlightedFounders.
 */
export const HighlightedFounders = () => {
  return (
    <div className="space-y-5">
      <Separator className="opacity-60" />

      <div className="space-y-1">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Lightbulb className="h-4 w-4" />
        </div>
        <h4 className="text-base font-semibold tracking-tight">Not sure who to learn from?</h4>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Search any of these founders on YouTube, then paste a talk or interview above
          to build your boardroom.
        </p>
      </div>

      <Tabs defaultValue={HIGHLIGHTED_FOUNDERS[0].decade} className="w-full">
        <div className="flex justify-center">
          <TabsList>
            {HIGHLIGHTED_FOUNDERS.map((group) => (
              <TabsTrigger key={group.decade} value={group.decade}>
                {group.decade}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {HIGHLIGHTED_FOUNDERS.map((group) => (
          <TabsContent key={group.decade} value={group.decade} className="space-y-3">
            <p className="text-xs text-muted-foreground">{group.blurb}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
              {group.founders.map((founder) => (
                <div
                  key={`${group.decade}-${founder.name}`}
                  className="rounded-xl border border-border/70 bg-card p-3"
                >
                  <span className="block text-sm font-medium leading-snug">{founder.name}</span>
                  <span className="block text-xs font-medium text-primary/80">{founder.company}</span>
                  <span className="mt-1 block text-xs text-muted-foreground leading-snug">
                    {founder.note}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <p className="text-[11px] leading-relaxed text-muted-foreground/70 max-w-md mx-auto">
        For inspiration only. Founder Mode Advice is independent and analyzes public
        content — the founders listed aren't affiliated with or endorsing the app.
      </p>
    </div>
  );
};
