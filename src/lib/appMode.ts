import { Capacitor } from "@capacitor/core";
import { isDespia } from "@/services/despiaService";
import { isExpoShell } from "@/services/expoShellService";

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

const APP_LAUNCH_FLAG = "fma-app-launch";

/**
 * `?source=app` marks an installed-app launch, but SPA navigations drop the
 * query string — persist the flag for the session so detection survives the
 * first route change.
 */
const hasAppLaunchParam = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("source") === "app") {
      window.sessionStorage?.setItem(APP_LAUNCH_FLAG, "1");
      return true;
    }
    return window.sessionStorage?.getItem(APP_LAUNCH_FLAG) === "1";
  } catch {
    return new URLSearchParams(window.location.search).get("source") === "app";
  }
};

/** Native wrapper: Capacitor (iOS/Android), Despia or Expo shell runtime, or an explicit app launch param. */
export const isNativeWrapper = (): boolean =>
  Capacitor.isNativePlatform() || isDespia() || isExpoShell() || hasAppLaunchParam();

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

/**
 * The distinct runtimes this app can be opened from. Use this for descriptive
 * decisions (analytics labels, layout hints) — for the "auth-first vs marketing"
 * routing decision, use {@link shouldShowAppAuthFirst}, which gates on the same
 * signals.
 */
export type RuntimeSurface =
  | "native-ios"
  | "native-android"
  | "web-desktop"
  | "web-mobile-browser"
  | "web-pwa";

const getUserAgent = (): string =>
  typeof navigator !== "undefined" ? navigator.userAgent : "";

/** Viewport-based desktop/mobile split — for layout/UX only, never for native detection. */
const isMobileViewport = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(max-width: 767px)").matches;

/**
 * Classify the current runtime into a single {@link RuntimeSurface}.
 *
 * Derived entirely from the predicates above so there is exactly one source of
 * truth. "Native" comes from real runtime signals ({@link isNativeWrapper}:
 * Capacitor platform, the Despia UA token, or an explicit ?source=app launch) —
 * never from viewport size or a bare mobile user-agent. iOS vs Android is taken
 * from the Capacitor platform when available, otherwise a coarse UA hint.
 */
export const getRuntimeSurface = (): RuntimeSurface => {
  if (isNativeWrapper()) {
    const platform = Capacitor.getPlatform();
    if (platform === "android") return "native-android";
    if (platform === "ios") return "native-ios";
    // Despia / ?source=app: Capacitor reports "web", so fall back to a UA hint.
    return /android/i.test(getUserAgent()) ? "native-android" : "native-ios";
  }
  if (isStandalonePWA()) return "web-pwa";
  return isMobileViewport() ? "web-mobile-browser" : "web-desktop";
};
