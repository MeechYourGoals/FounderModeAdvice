import { Brain, TrendingUp, Target, Sparkles, ArrowRight, MessageSquare, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import heroBg from "@/assets/hero-bg.jpg";

export const PublicLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Navigation - relative top bar with safe area (Despia pattern) */}
      <nav className="glass-nav relative z-50 border-b border-border" style={{ paddingTop: 'var(--safe-area-top)' }}>
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <button onClick={() => navigate("/")} className="font-bold text-sm sm:text-lg hover:text-primary transition-colors">Founder Mode Advice</button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")}>
              <span className="sm:hidden">Sign In</span>
              <span className="hidden sm:inline">Get Started</span>
              <ArrowRight className="ml-1 h-4 w-4 hidden sm:inline-block" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Scrollable content (Despia pattern) */}
      <div className="despia-scroll">
      {/* Hero Section */}
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
        <div className="container relative mx-auto px-4 py-16 sm:py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent animate-slide-up">
              VC-grade insight without VC access
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-slide-up">
              Turn public VC, operator, and founder interviews into startup-specific strategy. Paste a high-signal video, extract the pattern recognition, then ask follow-up questions grounded in the transcript.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-slide-up">
              <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8" onClick={() => navigate("/auth")}>
                Analyze a Video Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-12 sm:py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
            Turn expert content into private strategic guidance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard 
              icon={<Brain className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Beyond passive watching"
              description="Convert public interviews and podcasts into structured lessons, risks, and strategic takeaways for founders"
            />
            <FeatureCard 
              icon={<TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Tailored startup insight"
              description="Map the expert's public thinking to your stage, market, company context, and next decision"
            />
            <FeatureCard 
              icon={<Target className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Ask any video"
              description="Open a transcript-grounded chat after analysis and query the source behind each recommendation"
            />
          </div>
        </div>
      </section>

      {/* VC Access Positioning */}
      <section className="container mx-auto px-4 pb-12 sm:pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto glass rounded-3xl p-5 sm:p-8 md:p-10 border-primary/15">
          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-6 md:gap-10 items-start">
            <div className="space-y-4">
              <BadgeLabel>VC-grade insight without VC access</BadgeLabel>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                You do not need a top-tier investor on your cap table to learn from their public thinking.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                The best investors and operators have shared thousands of hours of pattern recognition in public interviews, podcasts, and talks. Founder Lessons turns that public content into structured, startup-specific guidance without implying affiliation, endorsement, or replacing real advisors.
              </p>
            </div>
            <div className="space-y-3">
              <MiniFeature icon={<ShieldCheck className="w-4 h-4" />} title="Public content in" description="Paste a public expert video from categories like VC interviews, operator podcasts, YC-style talks, or founder deep dives." />
              <MiniFeature icon={<Target className="w-4 h-4" />} title="Tailored strategy out" description="Distinguish summaries from decision-ready insight mapped to your company stage, market, and constraints." />
              <MiniFeature icon={<MessageSquare className="w-4 h-4" />} title="Transcript-grounded Q&A" description="Ask follow-up questions directly against the video transcript and extracted lessons after analysis." />
            </div>
          </div>
          <p className="mt-6 text-[11px] sm:text-xs text-muted-foreground">
            Examples such as a16z, YC, Benchmark, or individual investors/operators refer to public content categories only. Founder Lessons is independent and does not provide private access, endorsement, or investment advice from those people or firms.
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-muted/30 py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <p className="text-sm sm:text-lg text-muted-foreground px-4">
              "Most founders do not have elite investors on speed dial. But they can still extract useful patterns from the public conversations those experts have already shared."
            </p>
            <div className="flex justify-center gap-6 sm:gap-8 pt-4">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">500+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Expert videos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">2,000+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Transcript-grounded lessons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">100+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Public experts</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12 sm:py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center space-y-4 sm:space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Ready to turn interviews into strategy?
          </h2>
          <p className="text-sm sm:text-lg text-muted-foreground">
            Paste a public expert video, get tailored startup insights, and ask grounded follow-up questions against the transcript.
          </p>
          <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8" onClick={() => navigate("/auth")}>
            Analyze Your First Video
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 sm:py-8" style={{ paddingBottom: 'calc(1.5rem + var(--safe-area-bottom))' }}>
        <div className="container mx-auto px-4 text-center text-xs sm:text-sm text-muted-foreground">
          © {new Date().getFullYear()} Founder Mode Advice. Built for founders, by founders.
        </div>
      </footer>
      </div>
    </div>
  );
};

const BadgeLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
    {children}
  </div>
);

const MiniFeature = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="rounded-2xl bg-background/70 border border-border p-4">
    <div className="flex items-center gap-2 font-semibold text-sm sm:text-base mb-1">
      <span className="text-primary">{icon}</span>
      {title}
    </div>
    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  return (
    <div className="group glass elevate-hover p-4 sm:p-6 rounded-2xl hover:border-primary/30">
      <div className="text-primary mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
    </div>
  );
};
