import type { Session, User } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

/**
 * Where an installed app should land. An authenticated user enters the app shell;
 * an unauthenticated one sees login immediately. Marketing is web-only and never
 * appears in a native launch. `"loading"` while the session is still restoring —
 * the caller should show a splash/spinner, never a content flash.
 */
export type AuthEntryTarget = "app" | "auth" | "loading";

export const resolveAuthEntry = (
  state: Pick<AuthState, "session" | "loading">,
): AuthEntryTarget => {
  if (state.loading) return "loading";
  return state.session ? "app" : "auth";
};
