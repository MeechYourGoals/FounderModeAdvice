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
        "min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex items-center justify-center px-6 safe-area-inset",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="glass-strong shadow-lg rounded-3xl border border-border/60 px-8 py-7 text-center space-y-5 max-w-sm w-full">
        <BrandLogo className="h-10 w-auto mx-auto" />
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
};
