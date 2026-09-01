import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Landing route for OAuth returns from Supabase Auth (PKCE code exchange).
 *
 * Supabase redirects here after the provider callback with `?code=` (or legacy
 * token params). We exchange explicitly; detectSessionInUrl on the client is a
 * backstop. Native shells deliver the same params via the app scheme.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [message, setMessage] = useState("Completing sign in…");

  useEffect(() => {
    let active = true;

    const fail = (description: string) => {
      if (!active) return;
      setMessage("We couldn't complete sign in.");
      toast({ title: "Sign in failed", description, variant: "destructive" });
      navigate("/auth", { replace: true });
    };

    const succeed = () => {
      if (!active) return;
      // Strip tokens from the address bar before entering the app.
      window.history.replaceState({}, "", "/auth/callback");
      // Resume an interrupted flow (e.g. the OAuth consent screen) if one was
      // stashed before leaving for the provider; validated as relative.
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

    const run = async () => {
      const { accessToken, refreshToken, code, error } = readParams();

      if (error) return fail(error);

      if (accessToken && refreshToken) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setErr) return fail(setErr.message);
        return succeed();
      }

      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) return fail(exErr.message);
        return succeed();
      }

      // No credentials in the URL: the client may still be resolving a session
      // it detected itself. Give it a moment before giving up.
      await new Promise((r) => window.setTimeout(r, 1500));
      const { data } = await supabase.auth.getSession();
      if (data.session) return succeed();
      fail("Something went wrong completing sign in. Please try again.");
    };

    // A session delivered by the client's own URL detection also finishes here.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) succeed();
    });

    void run();

    return () => {
      active = false;
      subscription.unsubscribe();
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
