import { Building2, Check, ChevronDown, Plus, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { cn } from "@/lib/utils";

interface ProfileSwitcherProps {
  /** Compact width for mobile top bars. */
  compact?: boolean;
  className?: string;
}

/**
 * Persistent "active business profile" selector. The selected profile becomes
 * the lens for analysis + chat personalization across the app.
 */
export const ProfileSwitcher = ({ compact = false, className }: ProfileSwitcherProps) => {
  const { profiles, activeProfile, activeProfileId, setActiveProfileId } = useActiveProfile();

  const label = activeProfile ? activeProfile.company_name : "Universal";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("max-w-[180px] justify-between gap-1.5 rounded-full", compact && "max-w-[140px] h-8", className)}
          onClick={() => triggerHapticFeedback("light")}
        >
          {activeProfile ? (
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-xs sm:text-sm">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Today's lens
        </DropdownMenuLabel>

        <DropdownMenuItem onClick={() => setActiveProfileId(null)} className="gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">Universal (no profile)</span>
          {activeProfileId === null && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>

        {profiles.length > 0 && <DropdownMenuSeparator />}

        {profiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => {
              triggerHapticFeedback("light");
              setActiveProfileId(profile.id);
            }}
            className="gap-2"
          >
            <Building2 className="h-4 w-4 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="truncate">{profile.company_name}</div>
              {profile.industry && (
                <div className="truncate text-[11px] text-muted-foreground">{profile.industry}</div>
              )}
            </div>
            {activeProfileId === profile.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => window.dispatchEvent(new Event("openProfiles"))}
          className="gap-2 text-muted-foreground"
        >
          <Plus className="h-4 w-4" />
          Manage profiles
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
