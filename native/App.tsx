import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import * as ExpoLinking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
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

/**
 * Founder Mode Advice — Expo shell.
 *
 * A thin native wrapper around the production web app. The web app detects
 * this runtime via the `FMAShell/<version>` user-agent token
 * (src/services/expoShellService.ts in the repo root) and talks to it over
 * the react-native-webview postMessage bridge for haptics, RevenueCat
 * paywalls, OneSignal push, sharing, and theming. The shell reports purchase
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

/**
 * Full Safari/Chrome-like user agent with our token appended. Google OAuth
 * rejects stock WebView user agents ("disallowed_useragent"), so we present
 * a standard browser UA — the same approach Despia/Median-style wrappers use.
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-purchases").default ?? null;
  } catch {
    return null;
  }
}

function loadPurchasesUI(): PurchasesUIModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-purchases-ui").default ?? null;
  } catch {
    return null;
  }
}

// react-native-onesignal is optional at runtime (absent in Expo Go) — keep it loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadOneSignal(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
  | { type: "paywall"; userId: string; requiredEntitlement?: string; always?: boolean }
  | { type: "customerCenter" }
  | { type: "restorePurchases"; userId?: string }
  | { type: "pushRegister"; userId: string }
  | { type: "share"; title?: string; text?: string; url?: string }
  | { type: "openExternal"; url: string }
  | { type: "theme"; dark: boolean; backgroundColor: string };

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
  const [loadError, setLoadError] = useState(false);
  const [dark, setDark] = useState(true);
  const [background, setBackground] = useState("#0c0e15");
  const [webViewKey, setWebViewKey] = useState(0);
  const [revenueCatReady, setRevenueCatReady] = useState(false);
  const purchaseInFlight = useRef(false);
  const incomingUrl = ExpoLinking.useURL();

  // Keep Android nav bar / root view in sync with the web theme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(background).catch(() => {});
  }, [background]);

  /**
   * The web app reads --safe-area-top/--safe-area-bottom (Despia convention,
   * env() fallback). env() is unreliable inside Android WebViews, so inject
   * the real native insets on every load and whenever they change.
   */
  const safeAreaJS = useMemo(
    () =>
      `(function(){var s=document.documentElement.style;` +
      `s.setProperty('--safe-area-top','${Math.round(insets.top)}px');` +
      `s.setProperty('--safe-area-bottom','${Math.round(insets.bottom)}px');})();true;`,
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

  const notifyPurchaseSuccess = useCallback(() => {
    webViewRef.current?.injectJavaScript(
      `window.iapSuccess&&window.iapSuccess();true;`,
    );
  }, []);

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
          setRevenueCatReady(Boolean(await configureRevenueCat(message.userId)));
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
          } catch {
            // Logout cleanup is best-effort.
          }
          const Purchases = loadPurchases();
          if (Purchases && revenueCatConfigured) {
            try {
              await Purchases.logOut();
            } catch {
              // RevenueCat may already be anonymous.
            }
          }
          break;
        }

        case "paywall": {
          if (purchaseInFlight.current) break;
          purchaseInFlight.current = true;
          const Purchases = await configureRevenueCat(message.userId);
          const RevenueCatUI = loadPurchasesUI();
          if (!Purchases || !RevenueCatUI) {
            console.warn("Paywall unavailable (Expo Go or missing RevenueCat key)");
            purchaseInFlight.current = false;
            break;
          }
          try {
            const result =
              !message.always && message.requiredEntitlement
                ? await RevenueCatUI.presentPaywallIfNeeded({
                    requiredEntitlementIdentifier: message.requiredEntitlement,
                  })
                : await RevenueCatUI.presentPaywall();
            if (result === "PURCHASED" || result === "RESTORED") {
              void triggerHaptic("success");
              notifyPurchaseSuccess();
            }
          } catch (err) {
            console.warn("Paywall failed", err);
          } finally {
            purchaseInFlight.current = false;
          }
          break;
        }

        case "customerCenter": {
          const RevenueCatUI = loadPurchasesUI();
          if (!RevenueCatUI) break;
          try {
            await RevenueCatUI.presentCustomerCenter();
            notifyPurchaseSuccess(); // re-sync entitlements after any change
          } catch (err) {
            console.warn("Customer center failed", err);
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
            const info = await Purchases.restorePurchases();
            const restored = Object.keys(info.entitlements.active).length > 0;
            ackRestore(restored);
            if (restored) notifyPurchaseSuccess();
          } catch (err) {
            console.warn("Restore failed", err);
            ackRestore(false);
          }
          break;
        }

        case "pushRegister": {
          const OneSignal = loadOneSignal();
          if (!OneSignal || !extra.oneSignalAppId) break;
          try {
            OneSignal.login(message.userId);
            void OneSignal.Notifications.requestPermission(true);
          } catch (err) {
            console.warn("Push registration failed", err);
          }
          break;
        }

        case "share":
          try {
            await Share.share(
              Platform.OS === "ios"
                ? { message: message.text || message.title || "", url: message.url }
                : { message: [message.text, message.url].filter(Boolean).join("\n") },
            );
          } catch {
            // The user may dismiss the native share sheet.
          }
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
      }
    },
    [notifyPurchaseSuccess],
  );

  // OneSignal boots app-wide (before login) so permission prompts and device
  // registration work; user mapping happens on the identify/pushRegister messages.
  useEffect(() => {
    const OneSignal = loadOneSignal();
    if (OneSignal && extra.oneSignalAppId) {
      try {
        OneSignal.initialize(extra.oneSignalAppId);
      } catch (err) {
        console.warn("OneSignal init failed", err);
      }
    }
  }, []);

  // Keep server-enforced access in sync when StoreKit changes while the app is
  // running (renewal, revocation, billing recovery, or another-device purchase).
  useEffect(() => {
    if (!revenueCatReady) return;
    const Purchases = loadPurchases();
    if (!Purchases) return;
    const onCustomerInfo = () => notifyPurchaseSuccess();
    Purchases.addCustomerInfoUpdateListener(onCustomerInfo);
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void Purchases.getCustomerInfo().then(onCustomerInfo).catch(() => {});
      }
    });
    return () => {
      Purchases.removeCustomerInfoUpdateListener(onCustomerInfo);
      appState.remove();
    };
  }, [notifyPurchaseSuccess, revenueCatReady]);

  const onShouldStartLoadWithRequest = useCallback((request: WebViewNavigation) => {
    const { url } = request;
    if (url.startsWith("about:")) return true;

    // Non-http(s) schemes (mailto:, tel:, itms-apps:, market:) → OS handler.
    if (!/^https?:/i.test(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    if (isInternalHost(url)) return true;

    // External site → in-app browser sheet, keep the shell on the app.
    void WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
    return false;
  }, []);

  const reload = useCallback(() => {
    setLoadError(false);
    // Remount to recover from renderer crashes, not just navigation errors.
    setWebViewKey((k) => k + 1);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      <StatusBar style={dark ? "light" : "dark"} animated />
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
          style={styles.webview}
          userAgent={USER_AGENT}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={safeAreaJS}
          injectedJavaScript={safeAreaJS}
          onNavigationStateChange={(nav) => {
            canGoBackRef.current = nav.canGoBack;
            currentUrlRef.current = nav.url;
          }}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onLoadEnd={() => SplashScreen.hideAsync().catch(() => {})}
          onError={() => {
            setLoadError(true);
            SplashScreen.hideAsync().catch(() => {});
          }}
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
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
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
