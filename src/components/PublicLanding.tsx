import { Brain, TrendingUp, Target, Sparkles, ArrowRight } from "lucide-react";
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
            <span className="font-bold text-sm sm:text-lg">Founder Lessons</span>
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
              Learn From Founders Who've Been There
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-slide-up">
              Extract tactical insights from top founder podcasts. Learn from their crucible moments before making the same mistakes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-slide-up">
              <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8" onClick={() => navigate("/auth")}>
                Start Learning Free
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
              description="Automatically extract lessons from any podcast episode with AI that understands founder challenges"
            />
            <FeatureCard 
              icon={<TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Actionable Insights"
              description="Every lesson is ranked by impact and actionability so you can focus on what matters most"
            />
            <FeatureCard 
              icon={<Target className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Tailored to You"
              description="Get personalized callouts and recommendations based on your startup's stage and industry"
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-muted/30 py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <p className="text-sm sm:text-lg text-muted-foreground px-4">
              "Stop making the same mistakes other founders already learned from. Extract wisdom from hundreds of podcast episodes in minutes."
            </p>
            <div className="flex justify-center gap-6 sm:gap-8 pt-4">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">500+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Episodes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">2,000+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Lessons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">100+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Founders</div>
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
            Join founders who are learning from the best without spending hours listening to podcasts.
          </p>
          <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8" onClick={() => navigate("/auth")}>
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 sm:py-8" style={{ paddingBottom: 'calc(1.5rem + var(--safe-area-bottom))' }}>
        <div className="container mx-auto px-4 text-center text-xs sm:text-sm text-muted-foreground">
          © {new Date().getFullYear()} Founder Lessons Database. Built for founders, by founders.
        </div>
      </footer>
      </div>
    </div>
  );
};

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
