import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import * as ExpoLinking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useShareIntentContext, ShareIntentProvider } from "expo-share-intent";
import * as SystemUI from "expo-system-ui";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent, WebViewNavigation } from "react-native-webview";
import { Paywall } from "./Paywall";
import {
  DEFAULT_IAP_PLAN_ID,
  customerHasEntitlement,
  type IapPlanId,
} from "./iapPaywallCatalog";

/**
 * Founder Mode Advice — Expo shell.
 *
 * A thin native wrapper around the production web app. The web app detects
 * this runtime via the `FMAShell/<version>` user-agent token
 * (src/services/expoShellService.ts in the repo root) and talks to it over
 * the react-native-webview postMessage bridge for haptics, the in-shell IAP
 * paywall (Guideline 3.1.2(c) disclosures + StoreKit via RevenueCat),
 * OneSignal push, sharing, and theming. The shell reports purchase
 * results back through the same `window.iapSuccess` /
 * `window.onRevenueCatPurchase` globals the Despia wrapper uses.
 *
 * Native-module notes: RevenueCat and OneSignal are NOT available in Expo Go —
 * they load lazily and no-op there. Use an EAS development/preview build to
 * exercise purchases and push.
 */

SplashScreen.preventAutoHideAsync().catch(() => {});

const SHELL_VERSION = "1.0";

type ShellExtra = {
  webUrl?: string;
  oneSignalAppId?: string;
  revenueCatIosApiKey?: string;
  revenueCatAndroidApiKey?: string;
};

const extra: ShellExtra = (Constants.expoConfig?.extra as ShellExtra) ?? {};
const WEB_URL = (extra.webUrl || "https://foundermodeadvice.com").replace(/\/+$/, "");
const WEB_HOST = new URL(WEB_URL).hostname;
const START_URL = `${WEB_URL}/?source=app`;
const APP_SCHEME = "com.foundermodeadvice.app";
const READY_FALLBACK_MS = 12_000;

/** Best-effort http(s) URL extraction from free-form shared text (e.g. "check this out: https://..."). */
function firstUrlIn(text: string | undefined | null): string | null {
  const match = text?.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}

/**
 * Full Safari/Chrome-like user agent with our token appended. OAuth never runs
 * in this WebView (the shell presents an OS authentication session), but the
 * browser-like UA keeps the hosted app's device detection consistent.
 */
const USER_AGENT =
  Platform.OS === "ios"
    ? `Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 FMAShell/${SHELL_VERSION}`
    : `Mozilla/5.0 (Linux; Android 15; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 FMAShell/${SHELL_VERSION}`;

/** Hosts allowed to load inside the WebView (app + auth + backend flows). */
const INTERNAL_HOST_PATTERNS = [
  WEB_HOST,
  "localhost",
  ".supabase.co",
  ".lovable.app",
  ".lovable.dev",
  "accounts.google.com",
  ".googleusercontent.com",
  "appleid.apple.com",
  ".gstatic.com",
];

const isInternalHost = (url: string): boolean => {
  try {
    const host = new URL(url).hostname;
    // Dotted patterns match the exact base domain or a true dot-separated
    // subdomain — never suffix lookalikes like "fakesupabase.co".
    return INTERNAL_HOST_PATTERNS.some((p) =>
      p.startsWith(".") ? host === p.slice(1) || host.endsWith(p) : host === p,
    );
  } catch {
    return false;
  }
};

/**
 * Only the app's own origin may drive the native bridge. Auth/backend hosts
 * are allowed to *render* inside the WebView, but any message they post
 * (paywall, logout, share, …) is ignored.
 */
const isTrustedBridgeOrigin = (url: string | undefined): boolean => {
  try {
    const host = new URL(url ?? "").hostname;
    return host === WEB_HOST || host === "localhost";
  } catch {
    return false;
  }
};

// ─── Optional native modules (absent in Expo Go) ───────────────────────────

type PurchasesModule = typeof import("react-native-purchases").default;
type PurchasesUIModule = typeof import("react-native-purchases-ui").default;

function loadPurchases(): PurchasesModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-purchases").default ?? null;
  } catch {
    return null;
  }
}

function loadPurchasesUI(): PurchasesUIModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-purchases-ui").default ?? null;
  } catch {
    return null;
  }
}

// react-native-onesignal is optional at runtime (absent in Expo Go) — keep it loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadOneSignal(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-onesignal").OneSignal ?? null;
  } catch {
    return null;
  }
}

let revenueCatConfigured = false;

async function configureRevenueCat(userId: string): Promise<PurchasesModule | null> {
  const Purchases = loadPurchases();
  if (!Purchases) return null;

  const apiKey =
    Platform.OS === "ios" ? extra.revenueCatIosApiKey : extra.revenueCatAndroidApiKey;
  if (!apiKey) {
    console.warn("RevenueCat: no API key configured for", Platform.OS);
    return null;
  }
  // Belt-and-suspenders with the app.config.ts production build guard: a
  // RevenueCat Test Store key must never drive purchases in a release build.
  if (!__DEV__ && apiKey.startsWith("test_")) {
    console.warn("RevenueCat: refusing Test Store key in a release build");
    return null;
  }

  try {
    if (!revenueCatConfigured) {
      Purchases.configure({ apiKey, appUserID: userId });
      revenueCatConfigured = true;
    } else {
      // Await the identity switch so purchase UI can never run against the
      // previous (or anonymous) subscriber on a shared device.
      await Purchases.logIn(userId);
    }
    return Purchases;
  } catch (err) {
    console.warn("RevenueCat configure failed", err);
    return null;
  }
}

// ─── Bridge message types (mirror src/services/expoShellService.ts) ────────

type BridgeMessage =
  | { type: "haptic"; style?: string }
  | { type: "identify"; userId: string }
  | { type: "logout" }
  | {
      type: "paywall";
      userId: string;
      planId?: IapPlanId;
      requiredEntitlement?: string;
      always?: boolean;
    }
  | { type: "customerCenter" }
  | { type: "restorePurchases"; userId?: string }
  | { type: "pushRegister"; userId: string }
  | { type: "pushPrompt" }
  | { type: "appleSignIn" }
  | { type: "share"; title?: string; text?: string; url?: string; imageDataUrl?: string }
  | { type: "openExternal"; url: string }
  | { type: "theme"; dark: boolean; backgroundColor: string }
  | { type: "ready" };

type AppleSignInAck =
  | {
      ok: true;
      identityToken: string;
      nonce: string;
      email?: string | null;
      fullName?: string | null;
    }
  | { ok: false; fallback: "web" | "none"; error?: string };

/**
 * Native Sign in with Apple (Guideline 4.8). Expo Go cannot issue an identity
 * token whose audience matches our bundle id, so we tell the web layer to use
 * the existing web OAuth path there. EAS/dev-client/store builds present the
 * system sheet and return the raw nonce + identity token for Supabase.
 */
async function performNativeAppleSignIn(): Promise<AppleSignInAck> {
  if (Constants.appOwnership === "expo") {
    return { ok: false, fallback: "web", error: "expo-go" };
  }
  if (Platform.OS !== "ios") {
    return { ok: false, fallback: "web", error: "not-ios" };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AppleAuthentication = require("expo-apple-authentication");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Crypto = require("expo-crypto") as typeof import("expo-crypto");

    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      // Guideline 4.8: never fall through to WebView OAuth on iOS.
      return { ok: false, fallback: "none", error: "unavailable" };
    }

    const nonceBytes = await Crypto.getRandomBytesAsync(16);
    const rawNonce = Array.from(nonceBytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return { ok: false, fallback: "none", error: "no-identity-token" };
    }

    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(" ");

    return {
      ok: true,
      identityToken: credential.identityToken,
      nonce: rawNonce,
      email: credential.email ?? null,
      fullName: fullName || null,
    };
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "apple-sign-in-failed";
    if (
      code === "ERR_REQUEST_CANCELED" ||
      code === "ERR_CANCELED" ||
      code === "1001" ||
      /cancel/i.test(message)
    ) {
      return { ok: false, fallback: "none", error: "canceled" };
    }
    console.warn("Native Apple sign-in failed", err);
    // Hard native failure on iOS: surface the error, never open web OAuth.
    return { ok: false, fallback: "none", error: message };
  }
}

async function triggerHaptic(style?: string) {
  try {
    switch (style) {
      case "success":
        return await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case "warning":
        return await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case "error":
        return await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      case "medium":
        return await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case "heavy":
        return await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      default:
        return await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Haptics unavailable on some devices — ignore.
  }
}

function Shell() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const currentUrlRef = useRef(START_URL);
  const readyFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [dark, setDark] = useState(true);
  const [background, setBackground] = useState("#0c0e15");
  const [webViewKey, setWebViewKey] = useState(0);
  const [webReady, setWebReady] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallPlanId, setPaywallPlanId] = useState<IapPlanId>(DEFAULT_IAP_PLAN_ID);
  const incomingUrl = ExpoLinking.useURL();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const authSessionActiveRef = useRef(false);

  const hideSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const markWebReady = useCallback(() => {
    if (readyFallbackRef.current) {
      clearTimeout(readyFallbackRef.current);
      readyFallbackRef.current = null;
    }
    setWebReady(true);
    hideSplash();
  }, [hideSplash]);

  const scheduleReadyFallback = useCallback(() => {
    if (readyFallbackRef.current) clearTimeout(readyFallbackRef.current);
    readyFallbackRef.current = setTimeout(() => {
      readyFallbackRef.current = null;
      setWebReady(true);
      hideSplash();
    }, READY_FALLBACK_MS);
  }, [hideSplash]);

  useEffect(
    () => () => {
      if (readyFallbackRef.current) clearTimeout(readyFallbackRef.current);
    },
    [],
  );

  /** Route a native callback back to the hosted SPA without leaving auth in Safari. */
  const openWebCallback = useCallback((callbackUrl: string) => {
    if (!callbackUrl.startsWith(`${APP_SCHEME}://`)) return;
    const rest = callbackUrl.slice(`${APP_SCHEME}://`.length).replace(/^\/+/, "");
    const target = `${WEB_URL}/${rest}`;
    webViewRef.current?.injectJavaScript(
      `window.location.href=${JSON.stringify(target)};true;`,
    );
  }, []);

  /**
   * Google forbids OAuth in embedded WebViews. Run the broker/provider flow in
   * ASWebAuthenticationSession (iOS) / a custom tab (Android), then deliver the
   * registered custom-scheme callback to the SPA for session persistence.
   */
  const openOAuthSession = useCallback(async (url: string) => {
    if (authSessionActiveRef.current) return;
    authSessionActiveRef.current = true;
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        url,
        `${APP_SCHEME}://auth/callback`,
      );
      if (result.type === "success") openWebCallback(result.url);
    } catch (err) {
      console.warn("OAuth session failed", err);
    } finally {
      authSessionActiveRef.current = false;
    }
  }, [openWebCallback]);

  // Keep Android nav bar / root view in sync with the web theme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(background).catch(() => {});
  }, [background]);

  /**
   * The web app reads --safe-area-top/--safe-area-bottom (Despia convention,
   * env() fallback). env() is unreliable inside Android WebViews, so inject
   * the real native insets on every load and whenever they change. Dark
   * background covers the gap before Tailwind/CSS loads.
   */
  const safeAreaJS = useMemo(
    () =>
      `(function(){var s=document.documentElement.style;` +
      `s.setProperty('--safe-area-top','${Math.round(insets.top)}px');` +
      `s.setProperty('--safe-area-bottom','${Math.round(insets.bottom)}px');` +
      `document.documentElement.style.background='#0c0e15';` +
      `if(document.body)document.body.style.background='#0c0e15';})();true;`,
    [insets.top, insets.bottom],
  );

  useEffect(() => {
    webViewRef.current?.injectJavaScript(safeAreaJS);
  }, [safeAreaJS]);

  // Android hardware back → web history back, home-screen exit at the root.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBackRef.current) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // Deep links (custom scheme or https app links) → route inside the WebView.
  useEffect(() => {
    if (!incomingUrl) return;
    try {
      let target: string | null = null;
      if (incomingUrl.startsWith(`${APP_SCHEME}://`)) {
        // Custom scheme: URL parsers put the first segment in the *host*
        // (com.foundermodeadvice.app://auth/callback → host "auth", path
        // "/callback"), so keep everything after :// verbatim as the web path.
        const rest = incomingUrl.slice(`${APP_SCHEME}://`.length).replace(/^\/+/, "");
        target = `${WEB_URL}/${rest}`;
      } else {
        // https universal/app links: only our own host is routable.
        const parsed = new URL(incomingUrl);
        if (/^https?:$/.test(parsed.protocol) && parsed.hostname === WEB_HOST) {
          target = `${WEB_URL}${parsed.pathname}${parsed.search}`;
        }
      }
      if (target && target !== START_URL) {
        webViewRef.current?.injectJavaScript(
          `window.location.href=${JSON.stringify(target)};true;`,
        );
      }
    } catch {
      // Ignore unparseable URLs (e.g. exp:// development launches).
    }
  }, [incomingUrl]);

  // Share Extension (iOS) / share intent (Android): "Share" a link from any
  // app (YouTube, Safari, X, ...) straight into an analysis — the shared
  // payload arrives as a deep link the same way, so it reuses the exact
  // "/?url=" prefill path the web app's share-landing CTA also uses.
  useEffect(() => {
    if (!hasShareIntent) return;
    const shared = shareIntent?.webUrl || firstUrlIn(shareIntent?.text);
    if (shared) {
      const target = `${WEB_URL}/?url=${encodeURIComponent(shared)}&source=share-extension`;
      webViewRef.current?.injectJavaScript(
        `window.location.href=${JSON.stringify(target)};true;`,
      );
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  const notifyPurchaseSuccess = useCallback(() => {
    webViewRef.current?.injectJavaScript(
      `window.iapSuccess&&window.iapSuccess();true;`,
    );
  }, []);

  const acknowledgePaywall = useCallback((ok: boolean, error?: string) => {
    const result = JSON.stringify(error ? { ok, error } : { ok });
    webViewRef.current?.injectJavaScript(
      `window.__fmaShellPaywallResult&&window.__fmaShellPaywallResult(${result});true;`,
    );
  }, []);

  // Drop repeat paywall/customer-center requests while native purchase UI is
  // up — a double-tap in the web layer must never stack two StoreKit flows.
  const purchaseUIActiveRef = useRef(false);

  const closePaywall = useCallback(() => {
    purchaseUIActiveRef.current = false;
    setPaywallOpen(false);
  }, []);

  const finishPaywallSuccess = useCallback(() => {
    void triggerHaptic("success");
    notifyPurchaseSuccess();
    closePaywall();
  }, [closePaywall, notifyPurchaseSuccess]);

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      // The bridge is app-origin-only: pages from allow-listed third-party
      // hosts (auth, storage) render in this WebView but cannot drive native
      // actions like paywalls, logout, or the share sheet.
      if (!isTrustedBridgeOrigin(event.nativeEvent.url || currentUrlRef.current)) {
        console.warn("Ignoring bridge message from untrusted origin", event.nativeEvent.url);
        return;
      }

      let message: BridgeMessage;
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      switch (message.type) {
        case "haptic":
          void triggerHaptic(message.style);
          break;

        case "identify": {
          await configureRevenueCat(message.userId);
          const OneSignal = loadOneSignal();
          if (OneSignal && extra.oneSignalAppId) {
            try {
              OneSignal.login(message.userId);
            } catch (err) {
              console.warn("OneSignal login failed", err);
            }
          }
          break;
        }

        case "logout": {
          const OneSignal = loadOneSignal();
          try {
            OneSignal?.logout();
          } catch {}
          const Purchases = loadPurchases();
          if (Purchases && revenueCatConfigured) {
            try {
              await Purchases.logOut();
            } catch {}
          }
          break;
        }

        case "paywall": {
          if (purchaseUIActiveRef.current) {
            acknowledgePaywall(true);
            break;
          }
          const Purchases = await configureRevenueCat(message.userId);
          if (!Purchases) {
            console.warn("Paywall unavailable (Expo Go or missing RevenueCat key)");
            // Still present the disclosure wall so review/QA can read 3.1.2(c)
            // copy; Purchase is disabled until a store build has the SDK.
          } else if (!message.always && message.requiredEntitlement) {
            try {
              const info = await Purchases.getCustomerInfo();
              const active = Object.keys(info.entitlements?.active ?? {});
              if (customerHasEntitlement(active, message.requiredEntitlement)) {
                acknowledgePaywall(true);
                break;
              }
            } catch (err) {
              console.warn("Paywall entitlement check failed", err);
            }
          }
          setPaywallPlanId(message.planId ?? DEFAULT_IAP_PLAN_ID);
          purchaseUIActiveRef.current = true;
          setPaywallOpen(true);
          acknowledgePaywall(true);
          break;
        }

        case "customerCenter": {
          if (purchaseUIActiveRef.current) break;
          const RevenueCatUI = loadPurchasesUI();
          if (!RevenueCatUI) break;
          purchaseUIActiveRef.current = true;
          try {
            await RevenueCatUI.presentCustomerCenter();
            notifyPurchaseSuccess(); // re-sync entitlements after any change
          } catch (err) {
            console.warn("Customer center failed", err);
          } finally {
            purchaseUIActiveRef.current = false;
          }
          break;
        }

        case "restorePurchases": {
          // Explicitly ack success/failure so the web layer never shows a
          // false "restored" toast (it awaits __fmaShellRestoreResult).
          const ackRestore = (ok: boolean) =>
            webViewRef.current?.injectJavaScript(
              `window.__fmaShellRestoreResult&&window.__fmaShellRestoreResult(${ok});true;`,
            );
          const Purchases = message.userId
            ? await configureRevenueCat(message.userId)
            : revenueCatConfigured
              ? loadPurchases()
              : null;
          if (!Purchases) {
            ackRestore(false);
            break;
          }
          try {
            await Purchases.restorePurchases();
            ackRestore(true);
            notifyPurchaseSuccess();
          } catch (err) {
            console.warn("Restore failed", err);
            ackRestore(false);
          }
          break;
        }

        case "pushRegister": {
          // Silent mapping only — links this device to the signed-in user so
          // sends can reach devices that already granted permission. The OS
          // permission prompt is a separate, user-initiated "pushPrompt"
          // (fired when the user enables a notification preference).
          const OneSignal = loadOneSignal();
          if (!OneSignal || !extra.oneSignalAppId) break;
          try {
            OneSignal.login(message.userId);
          } catch (err) {
            console.warn("Push registration failed", err);
          }
          break;
        }

        case "pushPrompt": {
          const OneSignal = loadOneSignal();
          if (!OneSignal || !extra.oneSignalAppId) break;
          try {
            void OneSignal.Notifications.requestPermission(true);
          } catch (err) {
            console.warn("Push permission prompt failed", err);
          }
          break;
        }

        case "appleSignIn": {
          const result = await performNativeAppleSignIn();
          webViewRef.current?.injectJavaScript(
            `window.__fmaAppleSignInResult&&window.__fmaAppleSignInResult(${JSON.stringify(result)});true;`,
          );
          if (result.ok) void triggerHaptic("success");
          break;
        }

        case "share":
          try {
            if (Platform.OS === "ios" && message.imageDataUrl) {
              // iOS Share.share attaches the `url` as an image when it's a data:/file: URI;
              // the link still needs to travel as text since only one `url` slot exists.
              await Share.share({
                message: [message.text, message.url].filter(Boolean).join("\n") || message.title || "",
                url: message.imageDataUrl,
              });
            } else if (Platform.OS === "ios") {
              await Share.share({ message: message.text || message.title || "", url: message.url });
            } else {
              await Share.share({ message: [message.text, message.url].filter(Boolean).join("\n") });
            }
          } catch {}
          break;

        case "openExternal":
          if (/^https?:/i.test(message.url)) {
            void WebBrowser.openBrowserAsync(message.url).catch(() => {});
          }
          break;

        case "theme":
          setDark(message.dark);
          setBackground(message.backgroundColor);
          break;

        case "ready":
          markWebReady();
          break;
      }
    },
    [acknowledgePaywall, markWebReady, notifyPurchaseSuccess],
  );

  // OneSignal boots app-wide (before login) so permission prompts and device
  // registration work; user mapping happens on the identify/pushRegister messages.
  // Click/foreground handlers keep notifications inside the app (native feel)
  // instead of bouncing out to Safari.
  useEffect(() => {
    const OneSignal = loadOneSignal();
    if (!OneSignal || !extra.oneSignalAppId) return;
    try {
      OneSignal.initialize(extra.oneSignalAppId);
    } catch (err) {
      console.warn("OneSignal init failed", err);
      return;
    }

    const openInWebView = (rawUrl: string | undefined, path: string | undefined) => {
      let target: string | null = null;
      if (path && path.startsWith("/")) {
        target = `${WEB_URL}${path}`;
      } else if (rawUrl) {
        try {
          const parsed = new URL(rawUrl);
          if (parsed.hostname === WEB_HOST || parsed.protocol === APP_SCHEME + ":") {
            target =
              parsed.protocol.startsWith("http")
                ? `${WEB_URL}${parsed.pathname}${parsed.search}`
                : `${WEB_URL}/${rawUrl.replace(/^[^:]+:\/\//, "").replace(/^\/+/, "")}`;
          }
        } catch {
          target = null;
        }
      }
      if (!target) target = START_URL;
      webViewRef.current?.injectJavaScript(
        `window.location.href=${JSON.stringify(target)};true;`,
      );
    };

    const clickListener = (event: {
      notification?: { additionalData?: { path?: string; url?: string }; launchURL?: string };
    }) => {
      const data = event?.notification?.additionalData;
      openInWebView(data?.url || event?.notification?.launchURL, data?.path);
    };

    const foregroundListener = (event: { preventDefault?: () => void; getNotification?: () => { display?: () => void } }) => {
      // Show the system banner while the app is open — default OneSignal
      // behavior swallows it, which feels like a broken notification.
      try {
        event?.preventDefault?.();
        event?.getNotification?.()?.display?.();
      } catch {
        // Older SDK shapes — ignore; the notification is still delivered.
      }
    };

    try {
      OneSignal.Notifications.addEventListener("click", clickListener);
      OneSignal.Notifications.addEventListener("foregroundWillDisplay", foregroundListener);
    } catch (err) {
      console.warn("OneSignal notification listeners failed", err);
    }

    return () => {
      try {
        OneSignal.Notifications.removeEventListener("click", clickListener);
        OneSignal.Notifications.removeEventListener("foregroundWillDisplay", foregroundListener);
      } catch {
        // SDK may not expose removeEventListener in Expo Go.
      }
    };
  }, []);

  // Hide the web tab bar while the keyboard is up (same `keyboard-open` class
  // Capacitor/visualViewport already toggle on other runtimes).
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => {
      webViewRef.current?.injectJavaScript(
        `document.body&&document.body.classList.add('keyboard-open');true;`,
      );
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      webViewRef.current?.injectJavaScript(
        `document.body&&document.body.classList.remove('keyboard-open');true;`,
      );
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const onShouldStartLoadWithRequest = useCallback((request: WebViewNavigation) => {
    const { url } = request;
    if (url.startsWith("about:")) return true;

    // Lovable's OAuth broker is same-origin (`/~oauth/initiate`). Intercept it
    // before the WebView loads it; Google explicitly rejects embedded user
    // agents and an external auth session is required for a reliable login.
    try {
      const parsed = new URL(url);
      if (parsed.hostname === WEB_HOST && parsed.pathname === "/~oauth/initiate") {
        void openOAuthSession(url);
        return false;
      }
    } catch {
      // The generic URL handling below will reject malformed URLs safely.
    }

    // Non-http(s) schemes (mailto:, tel:, itms-apps:, market:) → OS handler.
    if (!/^https?:/i.test(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    if (isInternalHost(url)) return true;

    // External site → in-app browser sheet, keep the shell on the app.
    void WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
    return false;
  }, [openOAuthSession]);

  const reload = useCallback(() => {
    setLoadError(false);
    setWebReady(false);
    // Remount to recover from renderer crashes, not just navigation errors.
    setWebViewKey((k) => k + 1);
  }, []);

  const onWebViewLoadEnd = useCallback(() => {
    scheduleReadyFallback();
  }, [scheduleReadyFallback]);

  const onWebViewError = useCallback(() => {
    setLoadError(true);
    hideSplash();
  }, [hideSplash]);

  const onWebViewHttpError = useCallback(
    (event: { nativeEvent: { statusCode: number; url?: string } }) => {
      const { statusCode, url } = event.nativeEvent;
      if (statusCode < 400) return;
      try {
        const host = new URL(url ?? START_URL).hostname;
        if (host === WEB_HOST || host === "localhost") {
          setLoadError(true);
          hideSplash();
        }
      } catch {
        setLoadError(true);
        hideSplash();
      }
    },
    [hideSplash],
  );

  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      <StatusBar style={paywallOpen || !dark ? "dark" : "light"} animated />
      {loadError ? (
        <View style={[styles.errorContainer, { paddingTop: insets.top + 48 }]}>
          <Text style={[styles.errorTitle, { color: dark ? "#fbfcfe" : "#0c0e15" }]}>
            You&apos;re offline
          </Text>
          <Text style={styles.errorBody}>
            Founder Mode Advice needs a connection to load your library and run
            new analyses. Check your network and try again.
          </Text>
          <Pressable
            onPress={reload}
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}
          >
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          key={webViewKey}
          ref={webViewRef}
          source={{ uri: START_URL }}
          style={[styles.webview, { backgroundColor: background }]}
          userAgent={USER_AGENT}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={safeAreaJS}
          injectedJavaScript={safeAreaJS}
          onNavigationStateChange={(nav) => {
            canGoBackRef.current = nav.canGoBack;
            currentUrlRef.current = nav.url;
          }}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onLoadEnd={onWebViewLoadEnd}
          onError={onWebViewError}
          onHttpError={onWebViewHttpError}
          onRenderProcessGone={reload}
          onContentProcessDidTerminate={reload}
          renderLoading={() => (
            <View style={[styles.loading, { backgroundColor: background }]}>
              <ActivityIndicator color={dark ? "#fbfcfe" : "#0c0e15"} />
            </View>
          )}
          startInLoadingState
          // Behave like an app, not a browser page:
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled={false}
          setSupportMultipleWindows={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          domStorageEnabled
          javaScriptEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          overScrollMode="never"
          bounces={false}
          contentInsetAdjustmentBehavior="never"
          decelerationRate="normal"
          textZoom={100}
        />
      )}
      {!loadError && !webReady ? (
        <View style={[styles.loading, { backgroundColor: background }]} pointerEvents="none">
          <ActivityIndicator color={dark ? "#fbfcfe" : "#0c0e15"} />
        </View>
      ) : null}
      {paywallOpen ? (
        <Paywall
          purchases={loadPurchases()}
          initialPlanId={paywallPlanId}
          onDismiss={closePaywall}
          onSuccess={finishPaywallSuccess}
        />
      ) : null}
    </View>
  );
}

export default function App() {
  return (
    <ShareIntentProvider options={{ scheme: APP_SCHEME }}>
      <SafeAreaProvider>
        <Shell />
      </SafeAreaProvider>
    </ShareIntentProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
  loading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: { flex: 1, paddingHorizontal: 32, alignItems: "center" },
  errorTitle: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  errorBody: {
    color: "#8a8f9d",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
  },
  retryButton: {
    backgroundColor: "#6d5cff",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
  },
  retryPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  retryLabel: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
});
