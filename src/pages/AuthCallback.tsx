import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Landing route for the OAuth redirect (redirectTo points here).
 *
 * The Supabase client has detectSessionInUrl enabled by default, so it exchanges the
 * code/hash for a session automatically. We just wait for that to resolve, then route
 * the user into the app. If it fails, surface an error and send them back to /auth.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [message, setMessage] = useState("Completing sign in…");

  useEffect(() => {
    let active = true;

    const finish = (session: unknown | null) => {
      if (!active) return;
      if (session) {
        navigate("/", { replace: true });
      } else {
        setMessage("We couldn't complete sign in.");
        toast({
          title: "Sign in failed",
          description: "Something went wrong completing sign in. Please try again.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
      }
    };

    // React to the session being established by detectSessionInUrl.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });

    // Fallback: give the URL exchange a moment, then check explicitly.
    const timer = window.setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => finish(session));
    }, 1200);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [navigate, toast]);

  return (
    <div
      className="h-screen flex flex-col items-center justify-center gap-4 p-4"
      style={{ background: "var(--gradient-hero)" }}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

export default AuthCallback;
