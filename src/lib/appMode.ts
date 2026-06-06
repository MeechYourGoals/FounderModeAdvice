import { Capacitor } from "@capacitor/core";
import { isDespia } from "@/services/despiaService";

/**
 * Centralized environment / app-mode detection.
 *
 * Keep all "are we in a preview vs. installed app vs. plain browser" logic here so
 * auth-redirect and routing decisions stay consistent and testable. Avoid scattering
 * brittle user-agent checks across components.
 */

// The native deep-link scheme must match the Capacitor bundle id (com.foundermodeadvice.app).
export const NATIVE_OAUTH_REDIRECT = "com.foundermodeadvice.app://auth/callback";

/**
 * True only for Lovable sandbox/preview hosts, which cannot be added to the OAuth
 * allow-list and therefore must go through the Lovable managed auth bridge.
 *
 * Everything else — the published *.lovable.app domain, the FounderModeAdvice.com
 * custom domain, native wrappers, and localhost — uses Supabase OAuth directly.
 */
export const isLovablePreview = (): boolean => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith(".lovableproject.com") || host.includes("-preview--");
};

/** Installed PWA launched from the home screen (display-mode: standalone, or iOS Safari). */
export const isStandalonePWA = (): boolean => {
  if (typeof window === "undefined") return false;
  const displayModeStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandalone;
};

/** Native wrapper: Capacitor (iOS/Android), Despia runtime, or an explicit app launch param. */
export const isNativeWrapper = (): boolean => {
  const hasAppParam =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("source") === "app";
  return Capacitor.isNativePlatform() || isDespia() || hasAppParam;
};

/**
 * Whether the current context is an installed app experience that should open directly
 * on the auth screen (when unauthenticated) instead of the public marketing homepage.
 */
export const shouldShowAppAuthFirst = (): boolean =>
  isStandalonePWA() || isNativeWrapper();

/** Where OAuth providers should redirect back to after the user picks an account. */
export const getOAuthRedirectUrl = (): string => {
  if (Capacitor.isNativePlatform()) return NATIVE_OAUTH_REDIRECT;
  return `${window.location.origin}/auth/callback`;
};
