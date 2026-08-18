import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppNavMenu } from "@/components/AppNavMenu";
import { cn } from "@/lib/utils";
import { triggerHapticFeedback } from "@/lib/capacitor";

interface SecondaryPageHeaderProps {
  title: string;
  onBack: () => void;
  backLabel?: string;
  /** Extra controls shown before the menu button (e.g. FavoritesDrawer). */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Compact mobile header for authenticated secondary routes. Hidden on desktop
 * where AppChrome renders the global top bar with the hamburger menu.
 */
export const SecondaryPageHeader = ({
  title,
  onBack,
  backLabel = "Back",
  trailing,
  className,
}: SecondaryPageHeaderProps) => (
  <div
    className={cn(
      "glass-nav hairline-b relative z-50 lg:hidden",
      className,
    )}
    style={{ paddingTop: "var(--safe-area-top)" }}
  >
    <div className="flex items-center justify-between gap-2 px-4 py-3">
      <Button variant="ghost" size="sm" onClick={() => { triggerHapticFeedback("light"); onBack(); }} className="-ml-2 shrink-0">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {backLabel}
      </Button>
      <span className="font-semibold text-sm truncate px-2">{title}</span>
      <div className="flex items-center gap-1 shrink-0">
        {trailing}
        <AppNavMenu triggerVariant="ghost" />
      </div>
    </div>
  </div>
);
