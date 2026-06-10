import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404 route not found", { pathname: location.pathname });
  }, [location.pathname]);

  return (
    <div
      className="flex h-screen items-center justify-center bg-background pb-nav"
      style={{ paddingTop: "var(--safe-area-top)" }}
    >
      <div className="text-center px-6">
        <h1 className="mb-2 text-5xl font-bold">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Oops! Page not found</p>
        <Button asChild>
          <Link to="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
