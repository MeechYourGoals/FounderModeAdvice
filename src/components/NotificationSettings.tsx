import { Bell, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { isDespia } from "@/services/despiaService";
import { isExpoShell } from "@/services/expoShellService";
import { Capacitor } from "@capacitor/core";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";

export const NotificationSettings = () => {
  const { prefs, loading, saving, updatePref } = useNotificationPrefs();
  const inInstalledApp = isDespia() || isExpoShell() || Capacitor.isNativePlatform();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bell className="h-4 w-4" /></span>
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
              id="pref-weekly-briefing"
              label="Weekly Founder Briefing"
              description="One push when your personalized briefing is ready each week."
              checked={prefs.weekly_briefing}
              onChange={(v) => updatePref({ weekly_briefing: v })}
            />
            <Separator />
            <Row
              id="pref-daily"
              label="Daily founder prompt"
              description="A short, actionable prompt each morning."
              checked={prefs.daily_prompt}
              onChange={(v) => updatePref({ daily_prompt: v })}
            />
            <Separator />
            <Row
              id="pref-collaboration"
              label="Teammate replies"
              description="Alerts when someone responds on an analysis shared with your team."
              checked={prefs.collaboration_replies}
              onChange={(v) => updatePref({ collaboration_replies: v })}
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
