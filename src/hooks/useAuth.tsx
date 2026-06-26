import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ data?: unknown; error?: unknown }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Single source of truth for the Supabase session.
 *
 * Previously `useAuth` was a plain hook, so every consumer (~13 of them) spun up
 * its own `onAuthStateChange` subscription, its own `getSession()` call, and its
 * own `loading` flag — duplicate network work and a routing/UI race where each
 * copy of the session resolved on its own timeline. Centralizing it in one
 * provider gives the whole tree a single listener, a single session restore, and
 * one consistent `loading` transition. The public API is unchanged.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register the listener FIRST so we never miss an event fired during restore.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    // THEN restore any persisted session from storage.
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) return { error: new Error("No user logged in") };

    try {
      const { data, error } = await supabase.functions.invoke("delete-user-account");

      if (error) throw error;

      await signOut();
      return { data };
    } catch (error) {
      console.error("Error deleting account:", error);
      return { error };
    }
  }, [user, signOut]);

  const value = useMemo(
    () => ({ user, session, loading, signOut, deleteAccount }),
    [user, session, loading, signOut, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
