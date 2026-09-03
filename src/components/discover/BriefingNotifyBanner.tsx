import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { isDespia } from "@/services/despiaService";
import { isExpoShell } from "@/services/expoShellService";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { captureEvent } from "@/services/analytics";

const DISMISS_KEY = "fma_briefing_notify_dismissed";

/**
 * Moment-of-intent nudge to enable the Weekly Briefing push, shown on the For
 * You tab once there's actually a briefing to be notified about. Only in
 * installed-app runtimes — plain browsers have no push channel here.
 */
export const BriefingNotifyBanner = () => {
  const { prefs, loading, updatePref } = useNotificationPrefs();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const inInstalledApp = isDespia() || isExpoShell() || Capacitor.isNativePlatform();

  if (!inInstalledApp || loading || prefs.weekly_briefing || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bell className="h-4 w-4" />
      </span>
      <p className="flex-1 text-footnote text-foreground/90">
        Get a nudge the moment next week's briefing is ready.
      </p>
      <Button
        size="sm"
        variant="secondary"
        className="min-h-[36px] rounded-full"
        onClick={() => {
          triggerHapticFeedback("light");
          captureEvent("weekly_briefing_notify_enabled", { source: "discover_banner" });
          void updatePref({ weekly_briefing: true });
          dismiss();
        }}
      >
        Notify me
      </Button>
      <button
        type="button"
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
        onClick={dismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
