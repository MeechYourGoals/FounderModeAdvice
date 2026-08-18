import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bookmark,
  Briefcase,
  Compass,
  LogOut,
  Menu,
  Moon,
  Monitor,
  Settings,
  Star,
  Sun,
  User,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { cn } from "@/lib/utils";

interface AppNavMenuProps {
  /** Icon button styling — ghost for mobile top bars, outline for desktop. */
  triggerVariant?: "ghost" | "outline";
  triggerClassName?: string;
  /** Called after choosing an item that opens a home panel (profiles/bookmarks). */
  onOpenPanel?: (panel: "profiles" | "bookmarks") => void;
}

const menuItemClass =
  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors min-h-[48px] hover:bg-muted active:bg-muted";

/**
 * Hamburger navigation menu. On desktop it opens a compact dropdown; on
 * mobile/tablet it slides in from the right with larger touch targets and
 * includes the profile switcher (since the top bar stays minimal).
 */
export const AppNavMenu = ({
  triggerVariant = "outline",
  triggerClassName,
  onOpenPanel,
}: AppNavMenuProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { setTheme } = useTheme();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Close the mobile sheet when navigating away.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const close = () => setOpen(false);

  const openPanel = (panel: "profiles" | "bookmarks") => {
    triggerHapticFeedback("light");
    close();
    if (location.pathname === "/" && onOpenPanel) {
      onOpenPanel(panel);
      return;
    }
    if (location.pathname === "/") {
      window.dispatchEvent(new Event(panel === "profiles" ? "openProfiles" : "openBookmarks"));
      return;
    }
    navigate("/", { state: { panel, ts: Date.now() } });
  };

  const goTo = (path: string) => {
    triggerHapticFeedback("light");
    close();
    navigate(path);
  };

  const handleSignOut = () => {
    triggerHapticFeedback("light");
    close();
    signOut();
  };

  const setAppTheme = (theme: "light" | "dark" | "system") => {
    triggerHapticFeedback("light");
    setTheme(theme);
    if (!isDesktop) close();
  };

  const triggerButton = (
    <Button
      variant={triggerVariant}
      size="icon"
      className={cn(triggerVariant === "ghost" ? "h-10 w-10" : "h-9 w-9", triggerClassName)}
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );

  const dropdownItems = (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
        Library &amp; account
      </DropdownMenuLabel>
      <DropdownMenuItem onClick={() => goTo("/discover")}>
        <Compass className="h-4 w-4 mr-2" />
        Briefing
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => openPanel("profiles")}>
        <Briefcase className="h-4 w-4 mr-2" />
        Business Profiles
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => openPanel("bookmarks")}>
        <Bookmark className="h-4 w-4 mr-2" />
        Bookmarks
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => goTo("/favorites")}>
        <Star className="h-4 w-4 mr-2" />
        Favorites
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => goTo("/shared")}>
        <Users className="h-4 w-4 mr-2" />
        Shared with me
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => goTo("/account")}>
        <User className="h-4 w-4 mr-2" />
        Account
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => goTo("/settings")}>
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
        Appearance
      </DropdownMenuLabel>
      <DropdownMenuItem onClick={() => setAppTheme("light")}>
        <Sun className="h-4 w-4 mr-2" />
        Light
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setAppTheme("dark")}>
        <Moon className="h-4 w-4 mr-2" />
        Dark
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setAppTheme("system")}>
        <Monitor className="h-4 w-4 mr-2" />
        System
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleSignOut}>
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </DropdownMenuItem>
    </>
  );

  if (isDesktop) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {dropdownItems}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{triggerButton}</SheetTrigger>
      <SheetContent side="right" className="w-[min(320px,88vw)] safe-top safe-bottom">
        <SheetHeader className="text-left">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Profiles, library, settings, and more</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
              Today's lens
            </p>
            <ProfileSwitcher className="w-full max-w-none" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Library
            </p>
            <button type="button" className={menuItemClass} onClick={() => goTo("/discover")}>
              <Compass className="h-5 w-5 text-primary" />
              Briefing
            </button>
            <button type="button" className={menuItemClass} onClick={() => openPanel("profiles")}>
              <Briefcase className="h-5 w-5 text-primary" />
              Business Profiles
            </button>
            <button type="button" className={menuItemClass} onClick={() => openPanel("bookmarks")}>
              <Bookmark className="h-5 w-5 text-primary" />
              Bookmarks
            </button>
            <button type="button" className={menuItemClass} onClick={() => goTo("/favorites")}>
              <Star className="h-5 w-5 text-primary" />
              Favorites
            </button>
            <button type="button" className={menuItemClass} onClick={() => goTo("/shared")}>
              <Users className="h-5 w-5 text-primary" />
              Shared with me
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Account
            </p>
            <button type="button" className={menuItemClass} onClick={() => goTo("/account")}>
              <User className="h-5 w-5" />
              Account
            </button>
            <button type="button" className={menuItemClass} onClick={() => goTo("/settings")}>
              <Settings className="h-5 w-5" />
              Settings
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Appearance
            </p>
            <button type="button" className={menuItemClass} onClick={() => setAppTheme("light")}>
              <Sun className="h-5 w-5" />
              Light
            </button>
            <button type="button" className={menuItemClass} onClick={() => setAppTheme("dark")}>
              <Moon className="h-5 w-5" />
              Dark
            </button>
            <button type="button" className={menuItemClass} onClick={() => setAppTheme("system")}>
              <Monitor className="h-5 w-5" />
              System
            </button>
          </div>

          <button
            type="button"
            className={cn(menuItemClass, "text-destructive hover:bg-destructive/10")}
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
