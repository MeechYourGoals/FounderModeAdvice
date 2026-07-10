/**
 * Expo shell bridge — the third native runtime next to Capacitor and Despia.
 *
 * The Expo app in `native/` renders this web app inside a react-native-webview
 * and exposes native capabilities over the standard postMessage channel:
 *
 *   web  → shell : window.ReactNativeWebView.postMessage(JSON.stringify({type, ...}))
 *   shell → web  : injected JS calling the same globals Despia already uses
 *                  (window.iapSuccess / window.onRevenueCatPurchase) plus the
 *                  --safe-area-top / --safe-area-bottom CSS variables.
 *
 * Detection is two-signal: the shell appends the `FMAShell/<version>` token to
 * its user agent, and react-native-webview injects window.ReactNativeWebView.
 * Either alone identifies the runtime; requiring the UA token avoids matching
 * unrelated RN webviews embedding the site.
 */

type ShellMessage =
  | { type: "haptic"; style: "light" | "medium" | "heavy" | "success" | "warning" | "error" }
  | { type: "identify"; userId: string }
  | { type: "logout" }
  | { type: "paywall"; userId: string; requiredEntitlement?: string; always?: boolean }
  | { type: "customerCenter" }
  | { type: "restorePurchases" }
  | { type: "pushRegister"; userId: string }
  | { type: "share"; title: string; text: string; url: string }
  | { type: "openExternal"; url: string }
  | { type: "theme"; dark: boolean; backgroundColor: string };

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (data: string) => void };
  }
}

export const isExpoShell = (): boolean =>
  typeof navigator !== "undefined" && navigator.userAgent.includes("FMAShell");

/** Post a message to the Expo shell. Safe no-op outside the shell runtime. */
export function postToShell(message: ShellMessage): boolean {
  if (!isExpoShell()) return false;
  try {
    window.ReactNativeWebView?.postMessage(JSON.stringify(message));
    return true;
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Expo shell bridge failed", message.type, err);
    return false;
  }
}

export const triggerShellHaptic = (
  style: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light",
): void => {
  postToShell({ type: "haptic", style });
};

/** Configure RevenueCat + OneSignal in the shell with the signed-in user id. */
export const identifyShellUser = (userId: string): void => {
  postToShell({ type: "identify", userId });
};

export const logoutShellUser = (): void => {
  postToShell({ type: "logout" });
};

/**
 * Present the native RevenueCat paywall in the shell. Success is reported
 * asynchronously through window.onRevenueCatPurchase / window.iapSuccess —
 * the same callbacks SubscriptionContext already listens on for Despia.
 */
export const launchShellPaywall = (
  userId: string,
  requiredEntitlement?: string,
  always = false,
): boolean => postToShell({ type: "paywall", userId, requiredEntitlement, always });

export const openShellCustomerCenter = (): boolean => postToShell({ type: "customerCenter" });

/** Restore purchases natively; entitlement changes come back via iapSuccess. */
export const restoreShellPurchases = (): boolean => postToShell({ type: "restorePurchases" });

export const registerShellPush = (userId: string): void => {
  postToShell({ type: "pushRegister", userId });
};

export const shareViaShell = (payload: { title: string; text: string; url: string }): boolean =>
  postToShell({ type: "share", ...payload });

export const openShellExternalUrl = (url: string): boolean =>
  postToShell({ type: "openExternal", url });

/** Keep the native status bar + root view in sync with the web theme. */
export const syncShellTheme = (dark: boolean, backgroundColor: string): void => {
  postToShell({ type: "theme", dark, backgroundColor });
};
