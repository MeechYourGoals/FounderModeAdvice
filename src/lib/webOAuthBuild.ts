import type { Provider } from "@supabase/supabase-js";

export type WebOAuthProvider = Extract<Provider, "google" | "apple">;

/** Options passed to supabase.auth.signInWithOAuth for each provider. */
export function buildWebOAuthOptions(
  provider: WebOAuthProvider,
  needsExternalSession: boolean,
  redirectTo: string,
): {
  redirectTo: string;
  skipBrowserRedirect: boolean;
} {
  return {
    redirectTo,
    skipBrowserRedirect: needsExternalSession,
  };
}
