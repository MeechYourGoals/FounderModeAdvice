import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { isExpoShell, promptShellPush } from "@/services/expoShellService";

export interface NotificationPrefs {
  weekly_briefing: boolean;
  daily_prompt: boolean;
  collaboration_replies: boolean;
  plan_reminders: boolean;
  marketing: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  weekly_briefing: false,
  daily_prompt: false,
  collaboration_replies: false,
  plan_reminders: false,
  marketing: false,
};

/**
 * Load, optimistically update, and persist `user_notification_prefs`.
 * Turning any push preference ON is the contextual moment to request OS
 * permission in the Expo shell (registration itself happens silently at
 * login; see pushService.syncPushUser).
 */
export function useNotificationPrefs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_notification_prefs")
        .select("weekly_briefing, daily_prompt, collaboration_replies, plan_reminders, marketing")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("Failed to load notification prefs", error);
      } else if (data) {
        setPrefs(data as NotificationPrefs);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updatePref = async (patch: Partial<NotificationPrefs>) => {
    if (!user) return;
    triggerHapticFeedback("light");
    if (isExpoShell() && Object.values(patch).some(Boolean)) {
      promptShellPush();
    }
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const { error } = await supabase
        .from("user_notification_prefs")
        .upsert({ user_id: user.id, ...next, timezone }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to save notification prefs", err);
      toast({
        title: "Couldn't save preference",
        description: "Please try again.",
        variant: "destructive",
      });
      setPrefs((p) => ({ ...p, ...invert(patch) }));
    } finally {
      setSaving(false);
    }
  };

  return { prefs, loading, saving, updatePref };
}

function invert(patch: Partial<NotificationPrefs>): Partial<NotificationPrefs> {
  const out: Partial<NotificationPrefs> = {};
  for (const k of Object.keys(patch) as (keyof NotificationPrefs)[]) {
    out[k] = !patch[k];
  }
  return out;
}
