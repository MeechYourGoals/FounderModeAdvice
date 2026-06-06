import { useNavigate, useLocation } from "react-router-dom";
import { LayoutGrid, Bookmark, Plus, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHapticFeedback } from "@/lib/capacitor";

/**
 * Five-slot bottom navigation with a raised center "Analyze" FAB — the standard
 * native/app pattern. Library and Account are routes; Bookmarks, Profiles, and
 * Analyze open panels on the home screen via router state (see Index.tsx).
 */
export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const onHome = location.pathname === "/";

  const goHomeWith = (state: Record<string, unknown>) => {
    triggerHapticFeedback("light");
    navigate("/", { state: { ...state, ts: Date.now() } });
  };

  const SideItem = ({
    icon: Icon,
    label,
    active,
    onClick,
  }: {
    icon: typeof LayoutGrid;
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center flex-1 min-h-[44px] gap-0.5 transition-colors touch-manipulation [&>svg]:transition-transform active:[&>svg]:scale-90",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <nav
      className="glass-nav fixed bottom-0 left-0 right-0 z-50 border-t border-border safe-bottom md:hidden"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="relative flex items-center justify-around h-14 max-h-[calc(3.5rem+var(--safe-area-bottom))]">
        <SideItem
          icon={LayoutGrid}
          label="Library"
          active={onHome}
          onClick={() => { triggerHapticFeedback("light"); navigate("/"); }}
        />
        <SideItem
          icon={Bookmark}
          label="Bookmarks"
          active={false}
          onClick={() => goHomeWith({ panel: "bookmarks" })}
        />

        {/* Center Analyze FAB */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => goHomeWith({ action: "analyze" })}
            aria-label="Analyze a video"
            className="-mt-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center ring-4 ring-background transition-transform active:scale-90 touch-manipulation"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>

        <SideItem
          icon={Building2}
          label="Profiles"
          active={false}
          onClick={() => goHomeWith({ panel: "profiles" })}
        />
        <SideItem
          icon={User}
          label="Account"
          active={location.pathname.startsWith("/account")}
          onClick={() => { triggerHapticFeedback("light"); navigate("/account"); }}
        />
      </div>
    </nav>
  );
};
