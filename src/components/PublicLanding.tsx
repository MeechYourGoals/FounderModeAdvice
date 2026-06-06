import { Brain, TrendingUp, Target, ArrowRight, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import heroBg from "@/assets/hero-bg.jpg";

export const PublicLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Navigation - relative top bar with safe area (Despia pattern) */}
      <nav className="glass-nav relative z-50 border-b border-border" style={{ paddingTop: 'var(--safe-area-top)' }}>
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <span className="font-bold text-sm sm:text-lg">Founder Mode Advice</span>
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
              Turn Any Video Into Advice Built For You
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-slide-up">
              Drop in any video on the web — a TED talk, an interview, a founder's talk, a creator
              on YouTube — and get tactical advice tailored to you, your situation, and your startup.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-slide-up">
              <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8" onClick={() => navigate("/auth")}>
                Start Free
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
            Your Personal Founder Coach
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard
              icon={<Brain className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="AI-Powered Analysis"
              description="Paste any video link and AI that understands founder challenges extracts the lessons that matter"
            />
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Actionable Insights"
              description="Every lesson is ranked by impact and actionability so you can focus on what moves the needle"
            />
            <FeatureCard
              icon={<Target className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Tailored to You"
              description="Get personalized callouts and recommendations based on your startup's stage and industry"
            />
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="bg-muted/30 py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Not Another Locked-In Subscription
              </h2>
              <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                MasterClass, Augment, and Delphi cost a lot more and only give you the people on
                their roster — and even then, you get the generic takes those people chose to share.
                One clip of Bill Gates, the same advice for thousands of different viewers.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="glass rounded-2xl p-5 sm:p-6 space-y-3">
                <h3 className="font-semibold text-base sm:text-lg text-muted-foreground">
                  MasterClass · Augment · Delphi
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <ComparisonItem positive={false}>Locked to who they have on the platform</ComparisonItem>
                  <ComparisonItem positive={false}>One-size-fits-all insights for every viewer</ComparisonItem>
                  <ComparisonItem positive={false}>Premium price for a fixed library</ComparisonItem>
                </ul>
              </div>
              <div className="glass rounded-2xl p-5 sm:p-6 space-y-3 border border-primary/30">
                <h3 className="font-semibold text-base sm:text-lg text-primary">
                  Founder Mode Advice
                </h3>
                <ul className="space-y-2 text-sm">
                  <ComparisonItem positive>Learn from anyone with a video online</ComparisonItem>
                  <ComparisonItem positive>Every video tailored to your situation and startup</ComparisonItem>
                  <ComparisonItem positive>One app, any source — at a fraction of the cost</ComparisonItem>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <p className="text-sm sm:text-lg text-muted-foreground px-4">
              "Stop making the same mistakes others already learned from. Turn the videos you'd
              never have time to watch into advice tailored to you — in minutes."
            </p>
            <div className="flex justify-center gap-6 sm:gap-8 pt-4">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">Any</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Video</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">Anyone</div>
                <div className="text-xs sm:text-sm text-muted-foreground">On YouTube</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">100%</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Tailored to You</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12 sm:py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center space-y-4 sm:space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Ready to Learn Faster?
          </h2>
          <p className="text-sm sm:text-lg text-muted-foreground">
            Bring your own videos and get advice built around your startup — without spending hours watching.
          </p>
          <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8" onClick={() => navigate("/auth")}>
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  return (
    <div className="glass elevate-hover p-4 sm:p-6 rounded-2xl hover:border-primary/30">
      <div className="text-primary mb-3 sm:mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

const ComparisonItem = ({ positive, children }: { positive: boolean; children: React.ReactNode }) => {
  const Icon = positive ? Check : X;
  return (
    <li className="flex items-start gap-2">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${positive ? "text-primary" : "text-muted-foreground"}`} />
      <span>{children}</span>
    </li>
  );
};
