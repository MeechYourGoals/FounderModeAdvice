import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Landing route for native OAuth returns (Capacitor scheme → /auth/callback?code=).
 *
 * PKCE code exchange is owned by the Supabase client (`detectSessionInUrl: true`).
 * This page waits for `onAuthStateChange`, handles provider errors in the URL, and
 * supports legacy implicit hash tokens when present.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [message, setMessage] = useState("Completing sign in…");

  useEffect(() => {
    let active = true;
    let finished = false;

    const fail = (description: string) => {
      if (!active || finished) return;
      finished = true;
      setMessage("We couldn't complete sign in.");
      toast({ title: "Sign in failed", description, variant: "destructive" });
      navigate("/auth", { replace: true });
    };

    const succeed = () => {
      if (!active || finished) return;
      finished = true;
      window.history.replaceState({}, "", "/auth/callback");
      let target = "/";
      try {
        const stashed = sessionStorage.getItem("fma_post_auth_redirect");
        sessionStorage.removeItem("fma_post_auth_redirect");
        if (stashed && stashed.startsWith("/") && !stashed.startsWith("//")) target = stashed;
      } catch {
        // ignore storage failures
      }
      navigate(target, { replace: true });
    };

    const readParams = () => {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const get = (key: string) => query.get(key) ?? hash.get(key);
      return {
        accessToken: get("access_token"),
        refreshToken: get("refresh_token"),
        code: get("code"),
        error: get("error_description") ?? get("error"),
      };
    };

    const { accessToken, refreshToken, code, error } = readParams();

    if (error) {
      fail(error);
      return () => {
        active = false;
      };
    }

    // Legacy implicit-flow tokens (hash); PKCE ?code= is handled by detectSessionInUrl.
    if (accessToken && refreshToken) {
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: setErr }) => {
          if (setErr) fail(setErr.message);
          else succeed();
        });
      return () => {
        active = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) succeed();
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) succeed();
    });

    const timeout = window.setTimeout(async () => {
      if (!active || finished) return;
      if (!code) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) succeed();
      else fail("Something went wrong completing sign in. Please try again.");
    }, 5000);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
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
