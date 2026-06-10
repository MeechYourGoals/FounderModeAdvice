import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404 route not found", { pathname: location.pathname });
  }, [location.pathname]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex items-center justify-center px-4 safe-area-inset">
      <section className="glass-strong w-full max-w-lg rounded-3xl border border-border/60 px-6 py-8 sm:px-10 sm:py-10 text-center shadow-lg">
        <BrandLogo className="h-10 w-auto mx-auto mb-8" />
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-primary mb-2">404 · Page not found</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          This page is off the map.
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto mb-7">
          The link may be outdated, mistyped, or no longer available. Head back to your Founder Mode Advice dashboard.
        </p>
        <Button asChild size="lg" className="min-h-[48px] px-6">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Link>
        </Button>
      </section>
    </main>
  );
};

export default NotFound;
