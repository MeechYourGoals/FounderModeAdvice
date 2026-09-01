import type { Provider } from "@supabase/supabase-js";
import { APPLE_WEB_SERVICES_CLIENT_ID } from "@/lib/canonicalOrigin";

export type WebOAuthProvider = Extract<Provider, "google" | "apple">;

/** Options passed to supabase.auth.signInWithOAuth for each provider. */
export function buildWebOAuthOptions(
  provider: WebOAuthProvider,
  needsExternalSession: boolean,
  redirectTo: string,
): {
  redirectTo: string;
  skipBrowserRedirect: boolean;
  queryParams?: { client_id: string };
} {
  const options: {
    redirectTo: string;
    skipBrowserRedirect: boolean;
    queryParams?: { client_id: string };
  } = {
    redirectTo,
    skipBrowserRedirect: needsExternalSession,
  };

  // Supabase dashboard docs once comma-joined the Services ID and bundle ID, which
  // Apple rejects on the web authorize URL (invalid_client). Web OAuth always
  // sends the Services ID; native iOS keeps the bundle id via signInWithIdToken.
  if (provider === "apple") {
    options.queryParams = { client_id: APPLE_WEB_SERVICES_CLIENT_ID };
  }

  return options;
}
