import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { isDespia } from "@/services/despiaService";
import { Capacitor } from "@capacitor/core";

interface Prefs {
  daily_prompt: boolean;
  plan_reminders: boolean;
  marketing: boolean;
}

const DEFAULT_PREFS: Prefs = {
  daily_prompt: false,
  plan_reminders: false,
  marketing: false,
};

export const NotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const inInstalledApp = isDespia() || Capacitor.isNativePlatform();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_notification_prefs")
        .select("daily_prompt, plan_reminders, marketing")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("Failed to load notification prefs", error);
      } else if (data) {
        setPrefs(data as Prefs);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updatePref = async (patch: Partial<Prefs>) => {
    if (!user) return;
    triggerHapticFeedback("light");
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const { error } = await supabase
        .from("user_notification_prefs")
        .upsert(
          { user_id: user.id, ...next, timezone },
          { onConflict: "user_id" },
        );
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notifications
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          {inInstalledApp
            ? "Choose which push notifications you want to receive."
            : "Install the app to receive push notifications. Preferences are saved either way."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Row
              id="pref-daily"
              label="Daily founder prompt"
              description="A short, actionable prompt each morning."
              checked={prefs.daily_prompt}
              onChange={(v) => updatePref({ daily_prompt: v })}
            />
            <Separator />
            <Row
              id="pref-plan"
              label="Plan reminders"
              description="Nudges to revisit saved action plans."
              checked={prefs.plan_reminders}
              onChange={(v) => updatePref({ plan_reminders: v })}
            />
            <Separator />
            <Row
              id="pref-marketing"
              label="Product updates"
              description="Occasional news about new features. No spam."
              checked={prefs.marketing}
              onChange={(v) => updatePref({ marketing: v })}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

const Row = ({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="space-y-0.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onChange} />
  </div>
);

function invert(patch: Partial<Prefs>): Partial<Prefs> {
  const out: Partial<Prefs> = {};
  for (const k of Object.keys(patch) as (keyof Prefs)[]) {
    out[k] = !patch[k];
  }
  return out;
}
