import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

interface AppLoadingScreenProps {
  label?: string;
  className?: string;
}

export const AppLoadingScreen = ({
  label = "Loading Founder Mode Advice...",
  className,
}: AppLoadingScreenProps) => {
  return (
    <div
      className={cn(
        "relative min-h-screen flex items-center justify-center px-6 safe-area-inset overflow-hidden",
        className,
      )}
      style={{ background: "var(--gradient-hero)" }}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-mesh)" }} />
      <div className="relative text-center space-y-6 animate-fade-in">
        <div className="relative inline-block">
          <div aria-hidden className="absolute -inset-8 rounded-full bg-primary/20 blur-2xl animate-pulse" />
          <BrandLogo className="relative h-12 w-auto mx-auto" />
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
};
