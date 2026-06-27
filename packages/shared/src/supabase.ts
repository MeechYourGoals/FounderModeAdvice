import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** localStorage / AsyncStorage / SecureStore-compatible adapter (sync or async). */
export interface AuthStorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export interface CreateSupabaseClientOptions {
  url: string;
  anonKey: string;
  /** Session persistence. Web passes localStorage; native passes AsyncStorage/SecureStore. */
  storage?: AuthStorageAdapter;
  /**
   * Parse the session out of the page URL on load. `true` for browser OAuth
   * redirects; `false` for native, where the app receives the code via a deep link
   * and exchanges it explicitly.
   */
  detectSessionInUrl?: boolean;
}

/**
 * Build a Supabase client with platform-appropriate auth persistence.
 *
 * The web app and the Expo app each supply their own storage, so neither needs to
 * know about the other's runtime. This is the one place the client is configured.
 */
export function createSupabaseClient({
  url,
  anonKey,
  storage,
  detectSessionInUrl = false,
}: CreateSupabaseClientOptions): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "createSupabaseClient: missing Supabase url/anonKey. Set them before initializing.",
    );
  }

  return createClient(url, anonKey, {
    auth: {
      storage: storage as never,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl,
    },
  });
}
