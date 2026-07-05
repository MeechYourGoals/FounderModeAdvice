import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IndustrySelect } from "@/components/IndustrySelect";
import { useAuth } from "@/hooks/useAuth";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useInspirations } from "@/hooks/useInspirations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { INSPIRATION_GROUPS, findInspirationOption } from "@/lib/inspirations";
import { cn } from "@/lib/utils";
import {
  Building2,
  Check,
  Compass,
  Lightbulb,
  Loader2,
  Plus,
  Rocket,
  X,
  type LucideIcon,
} from "lucide-react";

type StageType =
  | "pre_seed"
  | "seed"
  | "series_a"
  | "series_b_plus"
  | "growth"
  | "public"
  | "bootstrapped";

const STAGE_OPTIONS: { value: StageType; label: string }[] = [
  { value: "pre_seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b_plus", label: "Series B+" },
  { value: "growth", label: "Growth" },
  { value: "public", label: "Public" },
  { value: "bootstrapped", label: "Bootstrapped" },
];

type StepId = "welcome" | "business" | "context" | "inspirations" | "finish";

const STEP_META: Record<StepId, { icon: LucideIcon; title: string; description: string }> = {
  welcome: {
    icon: Rocket,
    title: "Welcome to Founder Mode Advice",
    description:
      "Turn almost any link or document into operating memos for your business. A minute of setup makes every memo yours — not a generic playbook.",
  },
  business: {
    icon: Building2,
    title: "Tell us about your business",
    description: "Memos adapt to what you're building. Leave blank to decide later — you can add profiles anytime.",
  },
  context: {
    icon: Compass,
    title: "Your stage and industry",
    description: "We tune language, examples, KPIs, and risks to where you actually are.",
  },
  inspirations: {
    icon: Lightbulb,
    title: "Who inspires you?",
    description:
      "Pick the founders, operators, and thought leaders you'd take advice from. We'll recommend who to look up on YouTube.",
  },
  finish: {
    icon: Check,
    title: "You're all set",
    description: "Paste almost any public link on the home screen and your first memo starts writing itself.",
  },
};

interface OnboardingFlowProps {
  open: boolean;
  /**
   * Called exactly once when the user finishes, skips, or dismisses — the
   * caller persists completion either way. `showWalkthrough` is true when the
   * user asked to be shown around the app afterwards.
   */
  onComplete: (showWalkthrough: boolean) => void;
}

export const OnboardingFlow = ({ open, onComplete }: OnboardingFlowProps) => {
  const { user } = useAuth();
  const { profiles, setActiveProfileId } = useActiveProfile();
  const { inspirations: savedInspirations, save: saveInspirations, loading: inspirationsLoading } = useInspirations();
  const { toast } = useToast();

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    description: "",
    stage: "" as StageType | "",
    industry: "",
    role: "",
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");
  const touchedInspirations = useRef(false);
  const finishedRef = useRef(false);

  // Users re-running setup with existing profiles skip the business steps.
  const steps = useMemo<StepId[]>(
    () =>
      profiles.length > 0
        ? ["welcome", "inspirations", "finish"]
        : ["welcome", "business", "context", "inspirations", "finish"],
    [profiles.length],
  );
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const meta = STEP_META[step];
  const Icon = meta.icon;
  const isFinish = step === "finish";

  // Pre-select previously saved picks when re-running setup.
  useEffect(() => {
    if (!inspirationsLoading && !touchedInspirations.current && savedInspirations.length > 0) {
      setSelected(savedInspirations);
    }
  }, [inspirationsLoading, savedInspirations]);

  const isSelected = (name: string) =>
    selected.some((n) => n.toLowerCase() === name.toLowerCase());

  const toggle = (name: string) => {
    triggerHapticFeedback("light");
    touchedInspirations.current = true;
    setSelected((prev) =>
      prev.some((n) => n.toLowerCase() === name.toLowerCase())
        ? prev.filter((n) => n.toLowerCase() !== name.toLowerCase())
        : [...prev, name],
    );
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    if (!isSelected(name)) toggle(name);
    setCustomName("");
  };

  const customPicks = selected.filter((name) => !findInspirationOption(name));

  const willCreateProfile =
    profiles.length === 0 &&
    Boolean(form.company_name.trim() && form.description.trim() && form.stage);

  const goNext = () => {
    triggerHapticFeedback("light");
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };
  const goBack = () => {
    triggerHapticFeedback("light");
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const finish = async (showWalkthrough: boolean) => {
    if (finishedRef.current) return;
    setSaving(true);
    try {
      // Inspirations first — their save is failure-tolerant, so a profile
      // insert error can't cost the user their picks.
      await saveInspirations(selected);
      if (willCreateProfile && user) {
        const { data, error } = await supabase
          .from("user_startup_profiles")
          .insert([
            {
              user_id: user.id,
              company_name: form.company_name.trim(),
              description: form.description.trim(),
              stage: form.stage as StageType,
              industry: form.industry.trim() || null,
              role: form.role.trim() || null,
            },
          ])
          .select("id")
          .single();
        if (error) throw error;
        if (data) {
          setActiveProfileId(data.id);
          window.dispatchEvent(new Event("profilesChanged"));
        }
      }
      triggerHapticFeedback("success");
      finishedRef.current = true;
      onComplete(showWalkthrough);
    } catch (err) {
      console.error("Failed to save onboarding setup", err);
      toast({
        title: "Couldn't save your setup",
        description: "You can add a business profile anytime from the Profiles tab.",
        variant: "destructive",
      });
      // Don't trap the user in a broken form — finish without the profile.
      finishedRef.current = true;
      onComplete(showWalkthrough);
    } finally {
      setSaving(false);
    }
  };

  const skipAll = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Closing (X / overlay / Esc / drag-down) counts as skipping setup.
        if (!next) skipAll();
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
          <DialogTitle className="text-center text-title-3 tracking-tight">{meta.title}</DialogTitle>
          <DialogDescription className="text-center leading-relaxed">
            {meta.description}
          </DialogDescription>
        </DialogHeader>

        {/* Step body */}
        <div className="max-h-[46vh] sm:max-h-[50vh] overflow-y-auto px-0.5 -mx-0.5">
          {step === "business" && (
            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="ob-company">Company name</Label>
                <Input
                  id="ob-company"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="Acme Inc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-description">What are you building?</Label>
                <Textarea
                  id="ob-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="One or two sentences — what you make, and for whom."
                  className="min-h-[88px]"
                />
              </div>
            </div>
          )}

          {step === "context" && (
            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="ob-stage">Stage</Label>
                <Select
                  value={form.stage}
                  onValueChange={(value) => setForm({ ...form, stage: value as StageType })}
                >
                  <SelectTrigger id="ob-stage">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <IndustrySelect
                id="ob-industry"
                value={form.industry}
                onChange={(value) => setForm({ ...form, industry: value })}
              />
              <div className="space-y-2">
                <Label htmlFor="ob-role">Your role <span className="text-foreground-quaternary">(optional)</span></Label>
                <Input
                  id="ob-role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="Founder & CEO"
                />
              </div>
            </div>
          )}

          {step === "inspirations" && (
            <div className="space-y-4 text-left">
              {INSPIRATION_GROUPS.map((group) => (
                <div key={group.id} className="space-y-2">
                  <p className="text-footnote text-foreground-tertiary font-medium">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.options.map((option) => {
                      const active = isSelected(option.name);
                      return (
                        <button
                          key={option.name}
                          type="button"
                          onClick={() => toggle(option.name)}
                          aria-pressed={active}
                          className={cn(
                            "pressable rounded-full border px-3 py-1.5 text-footnote transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border/70 bg-card text-foreground-secondary hover:border-primary/40 hover:bg-primary/5",
                          )}
                        >
                          {option.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <p className="text-footnote text-foreground-tertiary font-medium">Someone else?</p>
                {customPicks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customPicks.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-3 py-1.5 text-footnote text-primary-foreground shadow-sm"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => toggle(name)}
                          aria-label={`Remove ${name}`}
                          className="rounded-full hover:bg-primary-foreground/20"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustom();
                      }
                    }}
                    placeholder="Add a name"
                    aria-label="Add your own inspiration"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addCustom} aria-label="Add">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isFinish && (
            <div className="space-y-2 text-left">
              <FinishRow
                done={willCreateProfile}
                doneText={`${form.company_name.trim()} profile ready — memos will be tailored to it`}
                pendingText="No business profile yet — add one anytime from the Profiles tab"
              />
              <FinishRow
                done={selected.length > 0}
                doneText={`${selected.length} ${selected.length === 1 ? "inspiration" : "inspirations"} picked — look for "Picked for you" in your library`}
                pendingText="No inspirations picked — browse the founder ideas in your library instead"
              />
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-2">
          {steps.map((s, i) => (
            <span
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === stepIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          {isFinish ? (
            <Button variant="outline" size="sm" onClick={goBack} disabled={saving}>
              Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={skipAll} className="text-muted-foreground">
              Skip for now
            </Button>
          )}
          <div className="flex gap-2">
            {!isFinish && stepIndex > 0 && (
              <Button variant="outline" size="sm" onClick={goBack}>
                Back
              </Button>
            )}
            {isFinish ? (
              <>
                <Button variant="outline" size="sm" onClick={() => finish(false)} disabled={saving}>
                  Start exploring
                </Button>
                <Button size="sm" onClick={() => finish(true)} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Show me around
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={goNext}>
                {step === "welcome" ? "Let's go" : "Continue"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const FinishRow = ({ done, doneText, pendingText }: { done: boolean; doneText: string; pendingText: string }) => (
  <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-card p-3">
    <span
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
        done ? "bg-success/15 text-success" : "bg-muted text-foreground-quaternary",
      )}
    >
      <Check className="h-3 w-3" />
    </span>
    <span className="text-footnote text-foreground-secondary leading-snug">
      {done ? doneText : pendingText}
    </span>
  </div>
);
