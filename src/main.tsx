import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initializeNativePlugins, handleBackButton, initKeyboardViewportWatcher } from "./lib/capacitor";
import { isDespia } from "./services/despiaService";
import { isExpoShell, syncShellTheme } from "./services/expoShellService";
import { isNativeWrapper, isStandalonePWA, getRuntimeSurface } from "./lib/appMode";
import { initPushNotifications } from "./services/pushService";
import { initAnalytics, captureEvent } from "./services/analytics";
import { Capacitor } from "@capacitor/core";

// Initialize native plugins (Capacitor)
initializeNativePlugins();
handleBackButton();
initKeyboardViewportWatcher();

// Installed-app contexts get a fixed, non-zoomable viewport like a native app.
// Plain browser visitors keep pinch-zoom for accessibility.
if (isNativeWrapper() || isStandalonePWA()) {
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content",
    );
}

// Push notifications — registers the OneSignal web SDK inside Capacitor builds.
// Despia bridges native OneSignal natively; both paths get mapped to the
// signed-in user via syncPushUser() in AppChrome so server-side sends can reach
// this device. No-op in Lovable preview / dev / plain browser.
initPushNotifications();

// Product analytics (PostHog) — native bridge in Despia, web SDK in Capacitor /
// installed PWA, gated to installed-app runtimes. No-op until configured.
initAnalytics();

const inInstalledApp = isDespia() || isExpoShell() || Capacitor.isNativePlatform();
if (inInstalledApp) {
  captureEvent("native_app_opened", {
    runtime: isDespia() ? "despia" : isExpoShell() ? "expo-shell" : "capacitor",
    platform: Capacitor.getPlatform(),
    surface: getRuntimeSurface(),
  });
}

if (isDespia()) {
  console.log("Despia: Running inside Despia native runtime");
}

// Expo shell: keep the native status bar + root view in sync with the theme
// (colors match --background in index.css for dark/light).
if (isExpoShell()) {
  const pushThemeToShell = () => {
    const dark = document.documentElement.classList.contains("dark");
    syncShellTheme(dark, dark ? "#0c0e15" : "#fbfcfe");
  };
  pushThemeToShell();
  new MutationObserver(pushThemeToShell).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

// Expose app version for Settings → About display
console.log(`Founder Mode Advice — v${__APP_VERSION__}`);

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
