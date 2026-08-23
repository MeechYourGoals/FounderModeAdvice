import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { useChallenges } from "@/hooks/useChallenges";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { INSPIRATION_GROUPS, findInspirationOption } from "@/lib/inspirations";
import { CHALLENGE_OPTIONS, challengeLabels } from "@/lib/challenges";
import { AppMotionProvider, AnimatePresence, m, SPRING_SOFT } from "@/components/motion/appMotion";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Compass,
  FileText,
  Lightbulb,
  Link2,
  Loader2,
  Plus,
  Rocket,
  Sparkles,
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

type StepId = "welcome" | "challenges" | "business" | "context" | "inspirations" | "finish";

const STEP_META: Record<StepId, { icon: LucideIcon; title: string; description: string }> = {
  welcome: {
    icon: Rocket,
    title: "Welcome to Founder Mode Advice",
    description:
      "Turn almost any link or document into operating memos for your business. A minute of setup makes every memo yours — not a generic playbook.",
  },
  challenges: {
    icon: Compass,
    title: "What are you wrestling with?",
    description:
      "Pick everything that keeps you up at night. Your memos and weekly briefing lean into these first.",
  },
  business: {
    icon: Building2,
    title: "Set up your first profile",
    description:
      "This is what makes memos yours. Two fields now — every analysis gets rewritten for your company.",
  },
  context: {
    icon: Sparkles,
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

const WELCOME_HIGHLIGHTS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Link2, title: "Bring any source", text: "YouTube talks, podcasts, articles, decks, screenshots." },
  { icon: FileText, title: "Get an operating memo", text: "Lessons, risks, and action items — grounded in the transcript." },
  { icon: Sparkles, title: "Made for your company", text: "Every insight is rewritten for your stage, industry, and goals." },
];

/* Direction-aware step slide: forward pushes left, back pushes right. */
const STEP_VARIANTS = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 44 : -44 }),
  center: { opacity: 1, x: 0, transition: SPRING_SOFT },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -32 : 32, transition: { duration: 0.18 } }),
};

/* Confetti-lite: dot offsets radiating from the success check. */
const CONFETTI_DOTS = [
  { dx: -46, dy: -34, color: "hsl(211 100% 55%)" },
  { dx: 44, dy: -40, color: "hsl(38 92% 50%)" },
  { dx: -56, dy: 8, color: "hsl(142 71% 45%)" },
  { dx: 58, dy: 2, color: "hsl(356 84% 60%)" },
  { dx: -28, dy: 44, color: "hsl(271 91% 65%)" },
  { dx: 30, dy: 48, color: "hsl(199 90% 55%)" },
];

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
  const { challenges: savedChallenges, save: saveChallenges, loading: challengesLoading } = useChallenges();
  const { toast } = useToast();

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    description: "",
    stage: "" as StageType | "",
    industry: "",
    role: "",
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");
  const touchedInspirations = useRef(false);
  const touchedChallenges = useRef(false);
  const finishedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Users re-running setup with existing profiles skip the business steps.
  const steps = useMemo<StepId[]>(
    () =>
      profiles.length > 0
        ? ["welcome", "challenges", "inspirations", "finish"]
        : ["welcome", "challenges", "business", "context", "inspirations", "finish"],
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
  useEffect(() => {
    if (!challengesLoading && !touchedChallenges.current && savedChallenges.length > 0) {
      setSelectedChallenges(savedChallenges);
    }
  }, [challengesLoading, savedChallenges]);

  // Full-screen takeover: lock the page scroll behind the flow.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Each step starts scrolled to the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

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

  const toggleChallenge = (id: string) => {
    triggerHapticFeedback("light");
    touchedChallenges.current = true;
    setSelectedChallenges((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
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
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };
  const goBack = () => {
    triggerHapticFeedback("light");
    setDirection(-1);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const finish = async (showWalkthrough: boolean) => {
    if (finishedRef.current) return;
    setSaving(true);
    try {
      // Challenges and inspirations first — their saves are failure-tolerant,
      // so a profile insert error can't cost the user their picks.
      await saveChallenges(selectedChallenges);
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

  if (!open) return null;

  const pickedChallengeLabels = challengeLabels(selectedChallenges);

  return createPortal(
    <AppMotionProvider>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set up Founder Mode Advice"
        className="fixed inset-0 z-[70] flex flex-col bg-background"
      >
        {/* Ambient aurora backdrop — same vocabulary as the marketing hero. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="aurora-blob aurora-blob-1" />
          <div className="aurora-blob aurora-blob-2" />
        </div>

        {/* Top bar: progress + skip */}
        <div className="relative z-10 flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(var(--safe-area-top)+0.75rem)]">
          <div className="w-16">
            {stepIndex > 0 && !saving && (
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                aria-label="Back"
                className="h-9 w-9 rounded-full text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex justify-center gap-1.5" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
            {steps.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 ease-ios",
                  i === stepIndex ? "w-6 bg-primary" : i < stepIndex ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted-foreground/25",
                )}
              />
            ))}
          </div>
          <div className="flex w-16 justify-end">
            {!isFinish && (
              <Button variant="ghost" size="sm" onClick={skipAll} className="h-9 rounded-full px-3 text-footnote text-muted-foreground">
                Skip
              </Button>
            )}
          </div>
        </div>

        {/* Step content */}
        <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <m.div
              key={step}
              custom={direction}
              variants={STEP_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              className="mx-auto flex min-h-full w-full max-w-md flex-col"
            >
              {/* Step header */}
              <div className={cn("flex flex-col items-center text-center", step === "welcome" ? "pt-10 sm:pt-16" : "pt-2")}>
                <m.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, transition: { ...SPRING_SOFT, delay: 0.05 } }}
                  className="relative mb-4"
                >
                  <div aria-hidden className="absolute -inset-3 rounded-full bg-primary/15 blur-xl" />
                  {isFinish ? (
                    <div className="success-ring relative">
                      <div className="success-pop relative flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
                        <Check className="h-8 w-8" strokeWidth={3} />
                      </div>
                      {CONFETTI_DOTS.map((dot, i) => (
                        <span
                          key={i}
                          className="confetti-dot"
                          style={{ "--dx": `${dot.dx}px`, "--dy": `${dot.dy}px`, backgroundColor: dot.color } as React.CSSProperties}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={cn(
                      "relative flex items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.2)]",
                      step === "welcome" ? "h-20 w-20 animate-float-soft" : "h-14 w-14",
                    )}>
                      <Icon className={step === "welcome" ? "h-10 w-10" : "h-7 w-7"} />
                    </div>
                  )}
                </m.div>
                <h1 className={cn("tracking-tight text-balance", step === "welcome" ? "text-title-1" : "text-title-2")}>
                  {step === "welcome" ? (
                    <>
                      Welcome to{" "}
                      <span className="font-display font-medium italic text-gradient">Founder Mode Advice</span>
                    </>
                  ) : (
                    meta.title
                  )}
                </h1>
                <p className="mt-2 max-w-sm text-subhead leading-relaxed text-muted-foreground">
                  {meta.description}
                </p>
              </div>

              {/* Step body */}
              <div className="mt-6 flex-1">
                {step === "welcome" && (
                  <div className="space-y-2.5">
                    {WELCOME_HIGHLIGHTS.map((item, i) => (
                      <div
                        key={item.title}
                        style={{ "--stagger-i": i + 2 } as React.CSSProperties}
                        className="stagger-rise flex items-start gap-3.5 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-card"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <item.icon className="h-[1.125rem] w-[1.125rem]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-callout font-semibold">{item.title}</span>
                          <span className="mt-0.5 block text-footnote leading-snug text-foreground-tertiary">{item.text}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {step === "challenges" && (
                  <div className="grid grid-cols-2 gap-2">
                    {CHALLENGE_OPTIONS.map((option, i) => {
                      const active = selectedChallenges.includes(option.id);
                      const OptionIcon = option.icon;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleChallenge(option.id)}
                          aria-pressed={active}
                          style={{ "--stagger-i": i } as React.CSSProperties}
                          className={cn(
                            "stagger-rise pressable flex min-h-[56px] items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left transition-colors",
                            active
                              ? "border-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary))]"
                              : "border-border/70 bg-card text-foreground-secondary hover:border-primary/40 hover:bg-primary/5",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                              active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground-tertiary",
                            )}
                          >
                            {active ? <Check className="h-4 w-4 animate-scale-in" /> : <OptionIcon className="h-4 w-4" />}
                          </span>
                          <span className={cn("text-footnote font-medium leading-tight", active && "text-foreground")}>
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {step === "business" && (
                  <div className="space-y-4 text-left">
                    <div className="space-y-2">
                      <Label htmlFor="ob-company">Company name</Label>
                      <Input
                        id="ob-company"
                        value={form.company_name}
                        onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                        placeholder="Acme Inc."
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ob-description">What are you building?</Label>
                      <Textarea
                        id="ob-description"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="One or two sentences — what you make, and for whom."
                        className="min-h-[96px] rounded-xl"
                      />
                    </div>
                    <p className="text-caption-1 leading-relaxed text-foreground-tertiary">
                      Prefer to explore first? Skip this — you can add a profile anytime from the Profiles tab.
                    </p>
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
                        <SelectTrigger id="ob-stage" className="h-11 rounded-xl">
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
                        className="h-11 rounded-xl"
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
                          className="h-11 rounded-xl"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={addCustom} aria-label="Add" className="h-11 w-11 rounded-xl">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isFinish && (
                  <div className="space-y-2.5 text-left">
                    <FinishRow
                      index={0}
                      done={willCreateProfile}
                      doneText={`${form.company_name.trim()} profile ready — memos will be tailored to it`}
                      pendingText="No business profile yet — add one anytime from the Profiles tab"
                    />
                    <FinishRow
                      index={1}
                      done={pickedChallengeLabels.length > 0}
                      doneText={`Focused on ${pickedChallengeLabels.slice(0, 3).join(", ")}${pickedChallengeLabels.length > 3 ? ` +${pickedChallengeLabels.length - 3}` : ""}`}
                      pendingText="No challenges picked — your briefing stays general for now"
                    />
                    <FinishRow
                      index={2}
                      done={selected.length > 0}
                      doneText={`${selected.length} ${selected.length === 1 ? "inspiration" : "inspirations"} picked — look for "Picked for you" in your library`}
                      pendingText="No inspirations picked — browse the founder ideas in your library instead"
                    />
                  </div>
                )}
              </div>
            </m.div>
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="glass-nav hairline-t relative z-10 px-5 pt-3 pb-[calc(var(--safe-area-bottom)+0.875rem)]">
          <div className="mx-auto w-full max-w-md">
            {isFinish ? (
              <div className="flex flex-col gap-2">
                <Button size="lg" className="cta-shimmer relative w-full overflow-hidden rounded-xl" onClick={() => finish(true)} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Show me around
                </Button>
                <Button variant="ghost" size="lg" className="w-full rounded-xl text-muted-foreground" onClick={() => finish(false)} disabled={saving}>
                  Start exploring
                </Button>
              </div>
            ) : (
              <Button size="lg" className="w-full rounded-xl" onClick={goNext}>
                {step === "welcome"
                  ? "Let's go"
                  : step === "challenges" && selectedChallenges.length > 0
                    ? `Continue with ${selectedChallenges.length} ${selectedChallenges.length === 1 ? "focus" : "focuses"}`
                    : "Continue"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppMotionProvider>,
    document.body,
  );
};

const FinishRow = ({
  index,
  done,
  doneText,
  pendingText,
}: {
  index: number;
  done: boolean;
  doneText: string;
  pendingText: string;
}) => (
  <div
    style={{ "--stagger-i": index + 2 } as React.CSSProperties}
    className="stagger-rise flex items-start gap-2.5 rounded-xl border border-border/70 bg-card p-3.5"
  >
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
