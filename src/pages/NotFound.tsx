import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404 route not found", { pathname: location.pathname });
  }, [location.pathname]);

  return (
    <div
      className="grain relative flex h-screen items-center justify-center overflow-hidden pb-nav"
      style={{ background: "var(--gradient-hero)", paddingTop: "var(--safe-area-top)" }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-mesh)" }} />
      <div className="relative text-center px-6 animate-fade-in">
        <BrandLogo className="mx-auto mb-8 h-9 w-auto opacity-80" />
        <h1 className="font-display text-[7rem] sm:text-[9rem] font-medium italic leading-none text-gradient">
          404
        </h1>
        <p className="mt-2 text-lg sm:text-xl font-semibold tracking-tight">This page wandered off the transcript.</p>
        <p className="mt-1 mb-8 text-sm text-muted-foreground">
          The advice you're looking for isn't here — but your boardroom is.
        </p>
        <Button asChild size="lg" className="rounded-full px-7">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
