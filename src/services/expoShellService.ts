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
  | {
      type: "paywall";
      userId: string;
      planId?: ShellPaywallPlanId;
      requiredEntitlement?: string;
      always?: boolean;
    }
  | { type: "customerCenter" }
  | { type: "restorePurchases"; userId: string }
  | { type: "pushRegister"; userId: string }
  | { type: "pushPrompt" }
  | { type: "appleSignIn" }
  | { type: "share"; title: string; text: string; url: string; imageDataUrl?: string }
  | { type: "openExternal"; url: string }
  | { type: "theme"; dark: boolean; backgroundColor: string };

export type ShellAppleSignInResult =
  | {
      ok: true;
      identityToken: string;
      nonce: string;
      email?: string | null;
      fullName?: string | null;
    }
  | { ok: false; fallback: "web" | "none"; error?: string };

export type ShellPaywallPlanId = "seed" | "series_z";

export type ShellPaywallLaunchResult =
  | { ok: true }
  | { ok: false; error?: string };

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (data: string) => void };
    /** One-shot ack injected by the shell when a native restore settles. */
    __fmaShellRestoreResult?: (ok: boolean) => void;
    /** One-shot ack injected after the native subscription sheet is visible. */
    __fmaShellPaywallResult?: (result: ShellPaywallLaunchResult) => void;
    /** One-shot ack injected by the shell when native Sign in with Apple settles. */
    __fmaAppleSignInResult?: (result: ShellAppleSignInResult) => void;
  }
}

export const isExpoShell = (): boolean =>
  typeof navigator !== "undefined" && navigator.userAgent.includes("FMAShell");

/** Post a message to the Expo shell. Safe no-op outside the shell runtime. */
export function postToShell(message: ShellMessage): boolean {
  if (!isExpoShell()) return false;
  try {
    const bridge = window.ReactNativeWebView;
    if (!bridge || typeof bridge.postMessage !== "function") return false;
    bridge.postMessage(JSON.stringify(message));
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
 * Present the in-shell IAP paywall (Guideline 3.1.2(c) disclosures + StoreKit
 * via RevenueCat). Success is reported asynchronously through
 * window.onRevenueCatPurchase / window.iapSuccess — the same callbacks
 * SubscriptionContext already listens on for Despia.
 */
export const launchShellPaywall = (
  userId: string,
  requiredEntitlement?: string,
  always = false,
  planId?: ShellPaywallPlanId,
): boolean => postToShell({ type: "paywall", userId, requiredEntitlement, always, planId });

/**
 * Open the native subscription sheet and wait for the shell to confirm that it
 * is actually visible. A successful postMessage alone is not sufficient: an
 * unavailable or stale bridge must surface an error instead of looking like a
 * dead subscription button to the user (and to App Review).
 */
export const launchShellPaywallAndWait = (
  userId: string,
  options: {
    planId?: ShellPaywallPlanId;
    requiredEntitlement?: string;
    always?: boolean;
  } = {},
  timeoutMs = 8_000,
): Promise<boolean> => {
  if (!isExpoShell()) return Promise.resolve(false);

  return new Promise((resolve) => {
    const settle = (ok: boolean) => {
      window.clearTimeout(timer);
      window.__fmaShellPaywallResult = undefined;
      resolve(ok);
    };
    const timer = window.setTimeout(() => settle(false), timeoutMs);
    window.__fmaShellPaywallResult = (result) => settle(Boolean(result?.ok));

    if (
      !launchShellPaywall(
        userId,
        options.requiredEntitlement,
        options.always,
        options.planId,
      )
    ) {
      settle(false);
    }
  });
};

export const openShellCustomerCenter = (): boolean => postToShell({ type: "customerCenter" });

/**
 * Restore purchases natively and wait for the shell's explicit ack. Resolves
 * true only when the native RevenueCat restore completed; false on failure,
 * timeout, or when the bridge is unavailable — so callers can surface an
 * honest error instead of a false "restored" toast.
 */
export const restoreShellPurchasesAndWait = (
  userId: string,
  timeoutMs = 20_000,
): Promise<boolean> => {
  if (!isExpoShell()) return Promise.resolve(false);
  return new Promise((resolve) => {
    const settle = (ok: boolean) => {
      window.clearTimeout(timer);
      window.__fmaShellRestoreResult = undefined;
      resolve(ok);
    };
    const timer = window.setTimeout(() => settle(false), timeoutMs);
    window.__fmaShellRestoreResult = (ok) => settle(Boolean(ok));
    if (!postToShell({ type: "restorePurchases", userId })) settle(false);
  });
};

/** Silent device↔user mapping (no OS dialog). Safe to call on every login. */
export const registerShellPush = (userId: string): void => {
  postToShell({ type: "pushRegister", userId });
};

/**
 * Ask the OS for push permission. Only call from a user-initiated, contextual
 * action (e.g. enabling a notification preference) — never on launch/login.
 */
export const promptShellPush = (): void => {
  postToShell({ type: "pushPrompt" });
};

/**
 * Present native Sign in with Apple (AuthenticationServices) in the Expo
 * shell. Resolves with an identity token + raw nonce for
 * `supabase.auth.signInWithIdToken`, or a fallback instruction:
 *   - `web`  — Expo Go / simulator without the entitlement; use web OAuth
 *   - `none` — user cancelled or a hard native error; do not fall through
 */
export const requestShellAppleSignIn = (
  timeoutMs = 120_000,
): Promise<ShellAppleSignInResult> => {
  if (!isExpoShell()) {
    // Plain browser: web OAuth is the only Apple path and is expected here.
    return Promise.resolve({ ok: false, fallback: "web", error: "not-shell" });
  }
  return new Promise((resolve) => {
    const settle = (result: ShellAppleSignInResult) => {
      window.clearTimeout(timer);
      window.__fmaAppleSignInResult = undefined;
      resolve(result);
    };
    // Inside the shell, a stalled or unavailable native bridge is a hard
    // failure — Guideline 4.8 forbids a WebView OAuth fallback on iOS.
    const timer = window.setTimeout(
      () => settle({ ok: false, fallback: "none", error: "timeout" }),
      timeoutMs,
    );
    window.__fmaAppleSignInResult = (result) => settle(result);
    if (!postToShell({ type: "appleSignIn" })) {
      settle({ ok: false, fallback: "none", error: "bridge-unavailable" });
    }
  });
};

export const shareViaShell = (payload: { title: string; text: string; url: string; imageDataUrl?: string }): boolean =>
  postToShell({ type: "share", ...payload });

export const openShellExternalUrl = (url: string): boolean =>
  postToShell({ type: "openExternal", url });

/** Keep the native status bar + root view in sync with the web theme. */
export const syncShellTheme = (dark: boolean, backgroundColor: string): void => {
  postToShell({ type: "theme", dark, backgroundColor });
};
