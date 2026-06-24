import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isStandalonePWA, isNativeWrapper } from "@/lib/appMode";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { cn } from "@/lib/utils";

/**
 * Chromium fires this event before the browser shows its native install UI.
 * We capture it so we can present our own polished prompt and call `prompt()`
 * on user gesture (browsers reject the call otherwise).
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "fma:pwa-install-dismissed-at";
// Re-surface the prompt every 14 days if the user dismisses it.
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

const isIos = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !/crios|fxios|edgios/i.test(navigator.userAgent); // Safari only — Chrome/FF on iOS can't install

const recentlyDismissed = () => {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return ts > 0 && Date.now() - ts < SNOOZE_MS;
  } catch {
    return false;
  }
};

/**
 * Native-feeling install affordance for the installable web app.
 *
 * - Chromium / Edge / Android: captures `beforeinstallprompt`, hides the
 *   browser's default mini-infobar, and re-fires the prompt on user gesture.
 * - iOS Safari: shows a brief instructional sheet (Share → Add to Home Screen)
 *   since iOS has no programmatic install API.
 * - Hidden when already installed (standalone display-mode), inside the
 *   Capacitor/Despia native wrapper, or recently dismissed.
 */
export const PWAInstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Already running as an app — never prompt.
    if (isStandalonePWA() || isNativeWrapper()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault(); // suppress the browser's default mini-infobar
      if (recentlyDismissed()) return;
      setDeferred(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferred(null);
      setShowIos(false);
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {
        /* storage unavailable */
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari fallback — no `beforeinstallprompt` exists; show our sheet
    // after the user has had a moment with the app.
    if (isIos() && !recentlyDismissed()) {
      const timer = window.setTimeout(() => setShowIos(true), 12_000);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const remember = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage unavailable */
    }
  };

  const handleInstall = async () => {
    if (!deferred) return;
    setInstalling(true);
    triggerHapticFeedback("medium");
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "dismissed") remember();
    } catch {
      // user-agent rejected — fall through and let the sheet close
    } finally {
      setDeferred(null);
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    triggerHapticFeedback("light");
    remember();
    setDeferred(null);
    setShowIos(false);
  };

  // ---- Chromium / Android: native install banner ----
  if (deferred) {
    return (
      <div
        role="dialog"
        aria-label="Install Founder Mode Advice"
        className={cn(
          "fixed left-1/2 z-[60] w-[min(420px,calc(100vw-1.5rem))] -translate-x-1/2",
          "bottom-[calc(4.5rem+var(--safe-area-bottom))] md:bottom-6",
          "rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
        )}
      >
        <div className="flex items-start gap-3 p-4">
          <div
            className="shrink-0 h-11 w-11 rounded-xl flex items-center justify-center text-primary-foreground shadow-md"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight">Install Founder Mode</div>
            <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
              Launch from your home screen, open offline-cached UI, and get a focused
              full-screen experience.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="shrink-0 -mt-1 -mr-1 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="flex-1">
            Not now
          </Button>
          <Button
            size="sm"
            onClick={handleInstall}
            disabled={installing}
            className="flex-1"
          >
            {installing ? "Installing…" : "Install app"}
          </Button>
        </div>
      </div>
    );
  }

  // ---- iOS Safari: instructional sheet ----
  return (
    <Dialog open={showIos} onOpenChange={(open) => (open ? setShowIos(true) : handleDismiss())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div
            className="mx-auto mb-2 h-12 w-12 rounded-2xl flex items-center justify-center text-primary-foreground shadow-md"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Download className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Install on your iPhone</DialogTitle>
          <DialogDescription className="text-center">
            Add Founder Mode to your home screen for a full-screen, app-like experience.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm">
          <li className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span className="flex-1">
              Tap the <strong>Share</strong> icon in Safari
            </span>
            <Share className="h-4 w-4 text-primary" />
          </li>
          <li className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span className="flex-1">
              Scroll and choose <strong>Add to Home Screen</strong>
            </span>
            <Plus className="h-4 w-4 text-primary" />
          </li>
          <li className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
              3
            </span>
            <span className="flex-1">
              Tap <strong>Add</strong> — launch from your home screen anytime
            </span>
          </li>
        </ol>
        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss} className="w-full">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
