import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { CANONICAL_WEB_ORIGIN } from "@/lib/canonicalOrigin";
import { getOAuthRedirectUrl, redirectWwwToApexIfNeeded } from "@/lib/appMode";
import { isExpoShell, postToShell } from "@/services/expoShellService";
import {
  buildWebOAuthOptions,
  type WebOAuthProvider,
} from "@/lib/webOAuthBuild";

export type { WebOAuthProvider } from "@/lib/webOAuthBuild";
export { buildWebOAuthOptions } from "@/lib/webOAuthBuild";

/**
 * OAuth must never start on www — PKCE storage and Apple form_post both require
 * the same apex origin as redirectTo. Returns false when a redirect is in flight.
 */
export function ensureApexBeforeOAuth(): boolean {
  if (typeof window === "undefined") return true;
  if (redirectWwwToApexIfNeeded()) return false;
  if (window.location.hostname === "www.foundermodeadvice.com") {
    window.location.replace(
      `${CANONICAL_WEB_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    return false;
  }
  return true;
}

/**
 * Start Google or Apple sign-in through Supabase Auth (PKCE). Provider OAuth
 * completes at the Supabase project callback; Supabase then redirects to
 * redirectTo on the apex host so verifier storage matches the return URL.
 */
export async function signInWithOAuthProvider(
  provider: WebOAuthProvider,
): Promise<{ error: Error | null; redirected?: boolean }> {
  if (!ensureApexBeforeOAuth()) {
    return { error: null, redirected: true };
  }

  const needsExternalSession = isExpoShell() || Capacitor.isNativePlatform();
  const redirectTo = getOAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: buildWebOAuthOptions(provider, needsExternalSession, redirectTo),
  });

  if (error) return { error };

  if (needsExternalSession && data?.url) {
    if (isExpoShell()) {
      if (!postToShell({ type: "oauthSession", url: data.url })) {
        window.location.assign(data.url);
      }
    } else {
      window.location.assign(data.url);
    }
    return { error: null, redirected: true };
  }

  return { error: null };
}
