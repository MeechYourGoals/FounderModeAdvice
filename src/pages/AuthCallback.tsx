import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Landing route for every OAuth return path:
 *
 * 1. Lovable OAuth broker full-page redirect — tokens arrive as `access_token` /
 *    `refresh_token` params (query string on web, custom-scheme URL forwarded by
 *    the native shell). Supabase's `detectSessionInUrl` does NOT read those, so
 *    we call `setSession` explicitly. This was the cause of "sign in failed"
 *    loops after Google/Apple on the web and in TestFlight.
 * 2. PKCE style `?code=` returns — exchanged for a session.
 * 3. Implicit hash returns (`#access_token=…`) — handled by both 1 and the
 *    client's own URL detection.
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
      navigate("/", { replace: true });
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
