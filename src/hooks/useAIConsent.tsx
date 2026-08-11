import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

/**
 * One-time, per-user consent for third-party AI processing (Apple 5.1.1/5.1.2:
 * disclose where user content is sent and get permission before sending it).
 *
 * Usage: const { ensureAIConsent, aiConsentDialog } = useAIConsent();
 * `await ensureAIConsent()` resolves true immediately once the user has agreed
 * (stored per user id, versioned so material changes re-prompt), otherwise it
 * opens the dialog and resolves with the user's choice. Render
 * {aiConsentDialog} anywhere in the component's tree.
 */

const CONSENT_VERSION = 1;
const consentKey = (userId: string) => `fma_ai_consent_v${CONSENT_VERSION}_${userId}`;

export function hasAIConsent(userId: string | undefined): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(consentKey(userId)) === "granted";
  } catch {
    return false;
  }
}

export function recordAIConsent(userId: string): void {
  try {
    localStorage.setItem(consentKey(userId), "granted");
  } catch {
    // Storage unavailable (private mode) — the user will simply be asked again.
  }
}

export function useAIConsent() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<((granted: boolean) => void) | null>(null);

  const settle = useCallback((granted: boolean) => {
    setOpen(false);
    resolverRef.current?.(granted);
    resolverRef.current = null;
  }, []);

  const ensureAIConsent = useCallback((): Promise<boolean> => {
    if (hasAIConsent(user?.id)) return Promise.resolve(true);
    return new Promise((resolve) => {
      // If a prompt is somehow already pending, deny the older caller cleanly.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setOpen(true);
    });
  }, [user?.id]);

  const aiConsentDialog = (
    <AlertDialog open={open} onOpenChange={(next) => !next && settle(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Your content is analyzed with AI</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              To generate your memo, the links, documents, questions, and business-profile
              context you submit are sent to our AI processing partners: Google (Gemini
              models, accessed through our Lovable AI gateway) and, for public links,
              Supadata, which retrieves the transcript. Your content is used to produce
              your results — it is not used by us to train AI models.
            </span>
            <span className="block">
              Please avoid submitting sensitive personal information. See our{" "}
              <Link to="/privacy-policy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>{" "}
              for details. You can delete your data anytime from Account settings.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>Not now</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (user?.id) recordAIConsent(user.id);
              settle(true);
            }}
          >
            Agree and continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { ensureAIConsent, aiConsentDialog };
}
