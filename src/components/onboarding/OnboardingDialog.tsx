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
    body: "Turn founder, investor, and operator videos into transcript-grounded operating memos — lessons, risks, and action items tailored to your company, stage, and next decision.",
  },
  {
    icon: Video,
    title: "Analyze a video",
    body: "Paste any public video link — YouTube, Vimeo, LinkedIn, X, or a podcast — and we extract lessons, risks, and action items, each grounded in the transcript and adapted to your company.",
  },
  {
    icon: Building2,
    title: "Create company profiles",
    body: "Add a profile for each company, venture, or project. The selected profile tailors every analysis to your stage, industry, and context.",
  },
  {
    icon: Briefcase,
    title: "Set your stage and industry",
    body: "Each profile carries a stage and industry. We use them to tune the language, examples, KPIs, risks, and recommendations to your company — not a generic playbook.",
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
    body: "Start free, then upgrade to The C-Suite ($9.99/mo) for 20 analyses and up to 5 profiles (one target per submission), or The Boardroom ($19.99/mo) for unlimited analyses, multi-profile batch runs, and collaboration.",
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
          <div key={step} className="mx-auto mb-2 animate-scale-in">
            <div className="relative">
              <div aria-hidden className="absolute -inset-3 rounded-full bg-primary/15 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.2)]">
                <Icon className="h-7 w-7" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-xl tracking-tight">{current.title}</DialogTitle>
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
