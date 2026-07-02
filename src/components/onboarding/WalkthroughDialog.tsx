import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  Building2,
  FileText,
  FolderOpen,
  MapPin,
  MessageSquare,
  Settings,
  Target,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

/** Slots of the real MobileBottomNav, mirrored by the mini mock below. */
type NavSlot = "profiles" | "saved" | "lens" | "shared" | "settings";

interface WalkthroughSlide {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Viewport-specific "where to find it" hint. */
  findIt: { mobile: string; desktop: string };
  /** Which bottom-nav slot to highlight in the mini nav mock (mobile only). */
  navSlot?: NavSlot;
}

const SLIDES: WalkthroughSlide[] = [
  {
    icon: Video,
    title: "Analyze any video",
    body: "Paste any public founder, operator, or investor link — YouTube, podcasts, X, LinkedIn — and get an operating memo: lessons, risks, and action items grounded in the transcript.",
    findIt: {
      mobile: "The analyze box at the top of Home.",
      desktop: "The analyze box at the top of Home.",
    },
  },
  {
    icon: FileText,
    title: "Watch your memo write itself",
    body: "While we analyze, the stages play out live — transcript, lessons, mapping to your company. The finished memo reads like a publication, with scores on every insight.",
    findIt: {
      mobile: "Starts the moment you tap Analyze.",
      desktop: "Starts the moment you tap Analyze.",
    },
  },
  {
    icon: Target,
    title: "Choose who it's for",
    body: "The “Analyzing as” lens tailors each memo to one of your businesses — or go Universal for general takeaways.",
    findIt: {
      mobile: "The blue button in the middle of the bottom bar.",
      desktop: "The profile switcher next to the menu (☰) in the top bar.",
    },
    navSlot: "lens",
  },
  {
    icon: Building2,
    title: "Business Profiles",
    body: "Add each company once — stage, industry, what you're building — and every memo adapts automatically.",
    findIt: {
      mobile: "Profiles, first tab in the bottom bar.",
      desktop: "Business Profiles, in the menu (☰).",
    },
    navSlot: "profiles",
  },
  {
    icon: FolderOpen,
    title: "Save, organize, favorite",
    body: "Bookmark memos into folders by topic or business, and star the founders, channels, and topics you keep coming back to.",
    findIt: {
      mobile: "Saved, second tab in the bottom bar — Favorites lives in the menu.",
      desktop: "Bookmarks and Favorites, in the menu (☰).",
    },
    navSlot: "saved",
  },
  {
    icon: Users,
    title: "Share and collaborate",
    body: "Send folders or single analyses to teammates. Anything shared with you lands in Shared.",
    findIt: {
      mobile: "Shared, fourth tab in the bottom bar.",
      desktop: "Shared, in the menu (☰).",
    },
    navSlot: "shared",
  },
  {
    icon: MessageSquare,
    title: "Ask the video",
    body: "On The Boardroom plan, open a chat grounded in any analyzed video and ask unlimited follow-up questions about your business.",
    findIt: {
      mobile: "Inside any memo — look for “Ask the video.”",
      desktop: "Inside any memo — look for “Ask the video.”",
    },
  },
  {
    icon: Settings,
    title: "Make it yours",
    body: "Default profile, notifications, plan & billing — and you can replay this walkthrough from Settings anytime.",
    findIt: {
      mobile: "Settings, last tab in the bottom bar.",
      desktop: "Settings, in the menu (☰).",
    },
    navSlot: "settings",
  },
];

interface WalkthroughDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Slide-based feature tour showing what the app does and where things live.
 * Hints adapt to the viewport: below lg (where the bottom tab bar exists) a
 * mini nav mock highlights the tab being described; on desktop the copy points
 * at the top-right controls instead. Launched after onboarding setup and from
 * Settings/Account ("Replay app walkthrough").
 */
export const WalkthroughDialog = ({ open, onOpenChange }: WalkthroughDialogProps) => {
  const [step, setStep] = useState(0);
  // Matches the real bottom nav's visibility (`lg:hidden`).
  const hasBottomNav = useMediaQuery("(max-width: 1023px)");

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];
  const Icon = slide.icon;

  const handleNext = () => {
    triggerHapticFeedback("light");
    if (isLast) onOpenChange(false);
    else setStep((s) => Math.min(s + 1, SLIDES.length - 1));
  };
  const handleBack = () => {
    triggerHapticFeedback("light");
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div key={step} className="mx-auto mb-2 animate-scale-in">
            <div className="relative">
              <div aria-hidden className="absolute -inset-3 rounded-full bg-primary/15 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.2)]">
                <Icon className="h-7 w-7" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-title-3 tracking-tight">{slide.title}</DialogTitle>
          <DialogDescription className="text-center leading-relaxed">
            {slide.body}
          </DialogDescription>
        </DialogHeader>

        {/* Where to find it */}
        <div className="space-y-2.5">
          {hasBottomNav && slide.navSlot && <MiniNav active={slide.navSlot} />}
          <p className="flex items-center justify-center gap-1.5 text-caption-1 text-foreground-tertiary">
            <MapPin className="h-3 w-3 shrink-0" />
            {hasBottomNav ? slide.findIt.mobile : slide.findIt.desktop}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-2">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Skip
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Non-interactive replica of the bottom tab bar with one slot highlighted. */
const MiniNav = ({ active }: { active: NavSlot }) => (
  <div
    aria-hidden
    className="mx-auto flex max-w-[260px] items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-2 shadow-sm"
  >
    <MiniSlot icon={Building2} highlighted={active === "profiles"} />
    <MiniSlot icon={Bookmark} highlighted={active === "saved"} />
    <span
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md transition-transform",
        active === "lens" ? "scale-110 ring-2 ring-primary/40" : "opacity-70",
      )}
      style={{ background: "var(--gradient-primary)" }}
    >
      <Target className="h-4 w-4" />
    </span>
    <MiniSlot icon={Users} highlighted={active === "shared"} />
    <MiniSlot icon={Settings} highlighted={active === "settings"} />
  </div>
);

const MiniSlot = ({ icon: Icon, highlighted }: { icon: LucideIcon; highlighted: boolean }) => (
  <span
    className={cn(
      "flex h-8 w-8 items-center justify-center rounded-lg",
      highlighted ? "bg-primary/10 text-primary animate-tab-pop" : "text-foreground-quaternary",
    )}
  >
    <Icon className="h-4 w-4" />
  </span>
);
