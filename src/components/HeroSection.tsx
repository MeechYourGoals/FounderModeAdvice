import { Layers, ShieldCheck, Target } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export const HeroSection = () => {
  return (
    <section className="grain relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'var(--gradient-hero)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'var(--gradient-mesh)' }}
      />
      <div aria-hidden className="bg-grid absolute inset-0" />
      <div className="container relative mx-auto px-4 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto text-center space-y-3 sm:space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.025em] text-foreground animate-slide-up">
            Founder Mode Advice
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-slide-up">
            Paste almost any public link — an article, post, newsletter, video, or podcast. Get a
            transcript-grounded operating memo — lessons, risks, and action items — tailored to your company.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2 sm:pt-4 animate-slide-up">
            <FeatureCard
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Source-grounded"
              description="Every lesson, risk, and action cites the transcript — verify the advice, don't just take it on faith."
            />
            <FeatureCard
              icon={<Target className="h-4 w-4" />}
              title="Company-specific"
              description="Insight maps to your stage, industry, and the decision in front of you — not a generic playbook."
            />
            <FeatureCard
              icon={<Layers className="h-4 w-4" />}
              title="Saved to your library"
              description="File each memo into a playbook so your best thinking compounds instead of scrolling away."
            />
          </div>
        </div>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  return (
    <div className="glass elevate-hover p-4 sm:p-6 rounded-2xl text-left hover:border-primary/30">
      <div className="flex items-center gap-2.5 mb-1.5 sm:mb-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          {icon}
        </span>
        <h3 className="font-semibold text-base sm:text-lg">{title}</h3>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
};
