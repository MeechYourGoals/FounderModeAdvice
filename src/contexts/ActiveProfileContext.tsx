import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ActiveProfile {
  id: string;
  company_name: string;
  company_website: string | null;
  stage: string;
  funding_raised: string | null;
  valuation: string | null;
  employee_count: number | null;
  industry: string | null;
  description: string;
  role: string | null;
  deck_summary: string | null;
}

interface ActiveProfileContextType {
  profiles: ActiveProfile[];
  activeProfile: ActiveProfile | null;
  activeProfileId: string | null;
  /** Pass null to analyze without a business context ("universal" mode). */
  setActiveProfileId: (id: string | null) => void;
  loading: boolean;
  refreshProfiles: () => Promise<void>;
}

const ActiveProfileContext = createContext<ActiveProfileContextType | null>(null);

const cacheKey = (userId: string) => `fma_active_profile_${userId}`;

export function ActiveProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [profiles, setProfiles] = useState<ActiveProfile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfiles = useCallback(async () => {
    if (!userId) {
      setProfiles([]);
      setActiveProfileIdState(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_startup_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data || []) as ActiveProfile[];
      setProfiles(rows);

      // Resolve the active id: stored choice if still valid, otherwise the newest profile.
      const stored = localStorage.getItem(cacheKey(userId));
      const storedValid = stored && rows.some((p) => p.id === stored);
      if (storedValid) {
        setActiveProfileIdState(stored);
      } else if (stored === "__none__") {
        setActiveProfileIdState(null);
      } else {
        setActiveProfileIdState(rows[0]?.id ?? null);
      }
    } catch (err) {
      console.error("Failed to load business profiles", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    void refreshProfiles();
  }, [refreshProfiles]);

  // Other components dispatch "profilesChanged" after creating/deleting a profile.
  useEffect(() => {
    const handler = () => refreshProfiles();
    window.addEventListener("profilesChanged", handler);
    return () => window.removeEventListener("profilesChanged", handler);
  }, [refreshProfiles]);

  const setActiveProfileId = useCallback(
    (id: string | null) => {
      setActiveProfileIdState(id);
      if (userId) {
        localStorage.setItem(cacheKey(userId), id ?? "__none__");
      }
    },
    [userId],
  );

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;

  return (
    <ActiveProfileContext.Provider
      value={{ profiles, activeProfile, activeProfileId, setActiveProfileId, loading, refreshProfiles }}
    >
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  const ctx = useContext(ActiveProfileContext);
  if (!ctx) throw new Error("useActiveProfile must be used within an ActiveProfileProvider");
  return ctx;
}
