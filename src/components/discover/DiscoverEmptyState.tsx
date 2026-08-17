import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

interface DiscoverEmptyStateProps {
  title: ReactNode;
  description: ReactNode;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

/**
 * Never a dead screen: every empty path explains what is happening and offers
 * the next useful move. The Inspiration Library renders below this, so the user
 * always has something to read while their first edition is prepared.
 */
export const DiscoverEmptyState = ({
  title,
  description,
  action,
  secondaryAction,
}: DiscoverEmptyStateProps) => (
  <Card className="p-8 text-center sm:p-10">
    <div className="animate-float-soft relative mx-auto mb-4 w-fit">
      <div aria-hidden className="absolute -inset-3 rounded-full bg-primary/15 blur-xl" />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="h-6 w-6" />
      </div>
    </div>
    <h3 className="text-title-3">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-footnote text-muted-foreground">{description}</p>
    {(action || secondaryAction) && (
      <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {action && (
          <Button onClick={action.onClick} className="min-h-[44px] rounded-full sm:min-h-0">
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            variant="outline"
            onClick={secondaryAction.onClick}
            className="min-h-[44px] rounded-full sm:min-h-0"
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    )}
  </Card>
);
