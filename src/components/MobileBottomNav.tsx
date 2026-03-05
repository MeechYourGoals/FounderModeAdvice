import { useNavigate, useLocation } from "react-router-dom";
import { Home, User, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHapticFeedback } from "@/lib/capacitor";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/concierge", icon: Sparkles, label: "Concierge" },
  { path: "/founders", icon: Users, label: "Founders" },
  { path: "/account", icon: User, label: "Account" },
];

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-bottom md:hidden"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-14 max-h-[calc(3.5rem+var(--safe-area-bottom))]">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => { triggerHapticFeedback('light'); navigate(path); }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 min-h-[44px] gap-0.5 transition-colors touch-manipulation",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
