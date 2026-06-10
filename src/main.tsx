import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeNativePlugins, handleBackButton, initKeyboardViewportWatcher } from "./lib/capacitor";
import { isDespia } from "./services/despiaService";
import { isNativeWrapper, isStandalonePWA } from "./lib/appMode";
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

// OneSignal push notifications — only initialize inside an installed-app
// runtime. Skipping in Lovable preview / dev / plain browser avoids polluting
// those origins with a service worker and a SDK init they can't use.
const inInstalledApp = isDespia() || Capacitor.isNativePlatform();
if (inInstalledApp) {
  const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;
  if (oneSignalAppId) {
    import("react-onesignal")
      .then(({ default: OneSignal }) => OneSignal.init({ appId: oneSignalAppId }))
      .then(() => console.log("OneSignal: initialized"))
      .catch((err) => console.warn("OneSignal init failed", err));
  } else {
    console.log("OneSignal: VITE_ONESIGNAL_APP_ID not set — skipping push init");
  }
} else {
  console.log("Push init skipped: not running in installed app");
}

if (isDespia()) {
  console.log("Despia: Running inside Despia native runtime");
}

// Expose app version for Settings → About display
console.log(`Founder Mode Advice — v${__APP_VERSION__}`);

createRoot(document.getElementById("root")!).render(<App />);
