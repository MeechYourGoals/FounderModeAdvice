import { Capacitor } from "@capacitor/core";
import type { Provider } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getOAuthRedirectUrl } from "@/lib/appMode";
import { isExpoShell, postToShell } from "@/services/expoShellService";

/**
 * Start Google or Apple sign-in through Supabase Auth (PKCE). Provider OAuth
 * completes at the Supabase project callback; Supabase then redirects to
 * redirectTo on the apex host so verifier storage matches the return URL.
 */
export async function signInWithOAuthProvider(
  provider: Extract<Provider, "google" | "apple">,
): Promise<{ error: Error | null }> {
  const needsExternalSession = isExpoShell() || Capacitor.isNativePlatform();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getOAuthRedirectUrl(),
      skipBrowserRedirect: needsExternalSession,
    },
  });

  if (error) return { error };

  if (needsExternalSession && data?.url) {
    if (isExpoShell()) {
      if (!postToShell({ type: "oauthSession", url: data.url })) {
        window.location.assign(data.url);
      }
    } else {
      // Capacitor: leave the embedded WebView; appUrlOpen delivers the scheme callback.
      window.location.assign(data.url);
    }
  }

  return { error: null };
}
