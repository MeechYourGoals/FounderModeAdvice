import { BrandLogo } from "@/components/BrandLogo";
import { AppNavMenu } from "@/components/AppNavMenu";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  /** Home resets scroll/selection via this callback when provided (Index page). */
  onHomeClick?: () => void;
  /** Opens profiles/bookmarks sheet on the home page. */
  onOpenPanel?: (panel: "profiles" | "bookmarks") => void;
  /**
   * `home` — full bar on the dashboard (logo + controls).
   * `desktop-only` — fixed top bar on large screens; hidden on mobile where
   *   subpages keep their own back headers and the bottom tab bar.
   */
  variant?: "home" | "desktop-only";
  className?: string;
}

/**
 * Authenticated app header. Desktop shows logo, profile switcher, and a
 * hamburger menu; mobile home shows logo + menu only (profile + theme live
 * inside the slide-over menu). Secondary routes use `desktop-only` so mobile
 * keeps page-specific back navigation without a double header.
 */
export const AppHeader = ({
  onHomeClick,
  onOpenPanel,
  variant = "home",
  className,
}: AppHeaderProps) => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const handleHome = () => {
    triggerHapticFeedback("light");
    if (onHomeClick) {
      onHomeClick();
    } else {
      window.dispatchEvent(new Event("homeReset"));
    }
  };

  if (variant === "desktop-only" && !isDesktop) {
    return null;
  }

  const bar = (
    <div
      className={cn(
        "glass-nav hairline-b z-50",
        isDesktop ? "fixed top-0 left-0 right-0" : "relative",
        className,
      )}
      style={!isDesktop ? { paddingTop: "var(--safe-area-top)" } : undefined}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          isDesktop ? "mx-auto max-w-[100vw] px-4 py-2.5" : "px-4 py-2",
        )}
      >
        <button
          type="button"
          onClick={handleHome}
          className="flex items-center hover:opacity-80 transition-opacity shrink-0 min-h-[44px]"
          aria-label="Founder Mode Advice — home"
        >
          <BrandLogo className={isDesktop ? "h-9 w-auto" : "h-8 w-auto"} />
        </button>

        <div className="flex items-center gap-2">
          {isDesktop && <ProfileSwitcher />}
          <AppNavMenu
            triggerVariant={isDesktop ? "outline" : "ghost"}
            onOpenPanel={onOpenPanel}
          />
        </div>
      </div>
    </div>
  );

  return bar;
};
