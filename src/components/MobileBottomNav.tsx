import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Building2, Bookmark, Compass, Settings as SettingsIcon, Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { homePanelFromLocationState, mobileNavActiveTab } from "@/lib/mobileNav";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";

/**
 * Five-slot bottom nav for the mobile/PWA/native app shell:
 *   Profiles · Bookmarks · [Today's lens] · Briefing · Settings
 *
 * The raised center button surfaces the active "analyzing as" profile — the
 * lens that personalizes every analysis and every recommendation. Tapping it
 * opens a sheet to switch profiles without leaving the current screen.
 *
 * Briefing holds the fourth slot; "Shared with me" (the other Boardroom-only
 * surface, and a much lower-frequency one) moved into the hamburger menu,
 * which is present on every screen.
 */
export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profiles, activeProfile, activeProfileId, setActiveProfileId } = useActiveProfile();
  const [lensOpen, setLensOpen] = useState(false);

  const goHomeWith = (state: Record<string, unknown>) => {
    triggerHapticFeedback("light");
    const next = { ...state, ts: Date.now() };
    if (location.pathname === "/") {
      navigate(".", { replace: true, state: next });
      return;
    }
    navigate("/", { state: next });
  };

  // Pick the "analyzing as" lens, then jump straight into a fresh analysis on home.
  const selectLens = (id: string | null) => {
    triggerHapticFeedback("light");
    setActiveProfileId(id);
    setLensOpen(false);
    navigate("/", { state: { action: "analyze", ts: Date.now() } });
  };

  const SideItem = ({
    icon: Icon,
    label,
    active,
    onClick,
  }: {
    icon: typeof Building2;
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center justify-center flex-1 min-h-[44px] gap-0.5 transition-colors touch-manipulation",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full px-3.5 py-0.5 transition-all duration-200 ease-ios-spring group-active:scale-90",
          active ? "bg-primary/10 animate-tab-pop" : "bg-transparent",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
      </span>
      <span className={cn("text-[11px] leading-tight tracking-wide", active ? "font-semibold" : "font-medium")}>
        {label}
      </span>
    </button>
  );

  const lensLabel = activeProfile ? activeProfile.company_name : "Universal";

  const activeTab = mobileNavActiveTab(
    location.pathname,
    homePanelFromLocationState(location.state),
  );

  return (
    <nav
      className="mobile-bottom-nav glass-nav hairline-t no-select fixed bottom-0 left-0 right-0 z-50 safe-bottom lg:hidden"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="relative flex items-center justify-around h-14 max-h-[calc(3.5rem+var(--safe-area-bottom))]">
        <SideItem
          icon={Building2}
          label="Profiles"
          active={activeTab === "profiles"}
          onClick={() => goHomeWith({ panel: "profiles" })}
        />
        <SideItem
          icon={Bookmark}
          label="Saved"
          active={activeTab === "saved"}
          onClick={() => goHomeWith({ panel: "bookmarks" })}
        />

        {/* Center: Analyzing-As lens. A vaul drawer (not a modal sheet) so it
            drags like a native iOS page sheet and scales the screen behind. */}
        <div className="flex-1 flex justify-center">
          <Drawer open={lensOpen} onOpenChange={setLensOpen}>
            <DrawerTrigger asChild>
              <button
                aria-label={`Founder Mode Advice. Working as ${lensLabel}. Tap to write a memo.`}
                onClick={() => triggerHapticFeedback("light")}
                className="-mt-6 h-14 w-14 overflow-hidden rounded-full shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.25),0_8px_24px_-6px_hsl(var(--primary)/0.6)] flex items-center justify-center ring-4 ring-background transition-transform duration-200 active:scale-90 touch-manipulation"
                style={{ background: "var(--gradient-primary)" }}
              >
                <img
                  src="/apple-touch-icon.png"
                  alt="Founder Mode Advice"
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </button>
            </DrawerTrigger>
            <DrawerContent className="px-4 pb-[calc(1rem+var(--safe-area-bottom))]">
              <DrawerHeader className="px-0 text-left">
                <DrawerTitle>Today's lens</DrawerTitle>
                <DrawerDescription>
                  Pick the company I should write every memo, chat, and briefing for.
                </DrawerDescription>
              </DrawerHeader>
              <div className="max-h-[55vh] space-y-1 overflow-y-auto overscroll-contain">
                <button
                  onClick={() => selectLens(null)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors min-h-[56px]",
                    activeProfileId === null ? "bg-primary/10" : "hover:bg-muted active:bg-muted",
                  )}
                >
                  <span className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Universal</div>
                    <div className="text-xs text-muted-foreground">No specific business context</div>
                  </div>
                  {activeProfileId === null && <Check className="h-5 w-5 text-primary shrink-0" />}
                </button>

                {profiles.map((profile) => {
                  const selected = activeProfileId === profile.id;
                  return (
                    <button
                      key={profile.id}
                      onClick={() => selectLens(profile.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors min-h-[56px]",
                        selected ? "bg-primary/10" : "hover:bg-muted active:bg-muted",
                      )}
                    >
                      <span
                        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-primary-foreground font-bold"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        {profile.company_name.charAt(0).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{profile.company_name}</div>
                        {profile.industry && (
                          <div className="text-xs text-muted-foreground truncate">{profile.industry}</div>
                        )}
                      </div>
                      {selected && <Check className="h-5 w-5 text-primary shrink-0" />}
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    triggerHapticFeedback("light");
                    setLensOpen(false);
                    goHomeWith({ panel: "profiles" });
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-muted-foreground hover:bg-muted active:bg-muted min-h-[56px]"
                >
                  <span className="h-10 w-10 rounded-full border border-dashed border-border flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="flex-1 text-sm font-medium">Manage business profiles</div>
                </button>
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        <SideItem
          icon={Compass}
          label="Briefing"
          active={activeTab === "briefing"}
          onClick={() => { triggerHapticFeedback("light"); navigate("/discover"); }}
        />
        <SideItem
          icon={SettingsIcon}
          label="Settings"
          active={activeTab === "settings"}
          onClick={() => { triggerHapticFeedback("light"); navigate("/settings"); }}
        />
      </div>
    </nav>
  );
};
