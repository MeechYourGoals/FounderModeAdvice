import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { captureEvent } from "@/services/analytics";
import { fetchContributesToCommunity, setContributesToCommunity } from "@/services/community";

export const PrivacySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contributes, setContributes] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchContributesToCommunity(user.id)
      .then((value) => {
        if (!cancelled) setContributes(value);
      })
      .catch((err) => console.warn("Failed to load privacy prefs", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleChange = async (next: boolean) => {
    if (!user) return;
    triggerHapticFeedback("light");
    setContributes(next);
    setSaving(true);
    captureEvent("community_contribution_toggled", { enabled: next });
    try {
      await setContributesToCommunity(user.id, next);
    } catch (err) {
      console.error("Failed to save privacy prefs", err);
      setContributes(!next);
      toast({ title: "Couldn't save preference", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </span>
          Privacy
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>Control what's shared beyond your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="pref-community-contribution" className="text-sm font-medium">
                Contribute to the Community Library
              </Label>
              <p className="text-xs text-muted-foreground">
                Only the general lessons from public links you analyze, scrubbed of your company. Your tailored
                memos, uploads, and identity are never shared.
              </p>
            </div>
            <Switch
              id="pref-community-contribution"
              checked={contributes}
              onCheckedChange={(v) => void handleChange(v)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
