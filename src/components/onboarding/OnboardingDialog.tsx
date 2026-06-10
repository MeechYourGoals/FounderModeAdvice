import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Rocket,
  FolderOpen,
  Video,
  MessageSquare,
  Briefcase,
  Building2,
  Crown,
  type LucideIcon,
} from "lucide-react";

interface OnboardingStep {
  icon: LucideIcon;
  title: string;
  body: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: Rocket,
    title: "Welcome to Founder Mode Advice",
    body: "Turn any business, founder, operator, investor, or leadership video into practical, personalized advice for your company — whatever kind of business you run.",
  },
  {
    icon: Video,
    title: "Analyze a video",
    body: "Paste a public YouTube link and we extract the takeaways, risks, opportunities, and action items — adapted to your business.",
  },
  {
    icon: Building2,
    title: "Create business profiles",
    body: "Add profiles for your companies, side hustles, stores, agencies, or projects. The selected profile personalizes every analysis to your context.",
  },
  {
    icon: Briefcase,
    title: "Pick your industry",
    body: "Each profile has an industry. We use it to tune the language, examples, KPIs, risks, and recommendations — no assuming everyone is a VC-backed tech startup.",
  },
  {
    icon: FolderOpen,
    title: "Organize with folders",
    body: "Group analyses by topic, business, workflow, or learning path so your advice stays structured and easy to revisit.",
  },
  {
    icon: MessageSquare,
    title: "Ask the video (Boardroom)",
    body: "On The Boardroom plan, open a transcript-grounded chat on any analyzed video and ask unlimited follow-up questions about your business.",
  },
  {
    icon: Crown,
    title: "Choose your plan",
    body: "Start free, then upgrade to The C-Suite ($9.99/mo) for 20 analyses and 3 profiles, or The Boardroom ($19.99/mo) for unlimited everything plus video chat.",
  },
];

interface OnboardingDialogProps {
  open: boolean;
  /** Called when the user finishes or skips — persists completion either way. */
  onClose: () => void;
}

export const OnboardingDialog = ({ open, onClose }: OnboardingDialogProps) => {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Closing the dialog (X / overlay / Esc) counts as finishing the tour.
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-xl">{current.title}</DialogTitle>
          <DialogDescription className="text-center leading-relaxed">
            {current.body}
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-2">
          {STEPS.map((_, i) => (
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
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
            Skip
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLast ? "Get started" : "Next"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
