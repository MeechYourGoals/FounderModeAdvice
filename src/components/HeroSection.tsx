import heroBg from "@/assets/hero-bg.jpg";

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden">
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
      <div className="container relative mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto text-center space-y-3 sm:space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground animate-slide-up">
            Founder Mode Advice
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-slide-up">
            Turn any video on the web into tactical advice tailored to you, your situation, and your business.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2 sm:pt-4 animate-slide-up">
            <FeatureCard
              title="Structured Extraction"
              description="Pull the lessons that matter from any video. Every insight is organized into a clear, scannable format you can act on."
            />
            <FeatureCard
              title="Actionable Insights"
              description="Each takeaway is ranked by impact and actionability. Spend your time on the moves that actually move the needle."
            />
            <FeatureCard
              title="Tailored to You"
              description="Generic advice gets translated into callouts relevant to your business. Your stage, market, and goals shape every recommendation."
            />
          </div>
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ title, description }: { title: string; description: string }) => {
  return (
    <div className="glass elevate-hover p-4 sm:p-6 rounded-2xl hover:border-primary/30">
      <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
    </div>
  );
};
