import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Dynamic overrides on top of app.json. Set these in the shell environment
 * (or as EAS environment variables) to configure a build without editing
 * app.json:
 *
 *   FMA_WEB_URL                     — web app origin the shell loads
 *                                     (point at your LAN vite dev server for
 *                                     Expo Go testing, e.g. http://192.168.1.20:8080)
 *   FMA_ONESIGNAL_APP_ID            — OneSignal app id (push)
 *   FMA_REVENUECAT_IOS_API_KEY      — RevenueCat public SDK key (iOS)
 *   FMA_REVENUECAT_ANDROID_API_KEY  — RevenueCat public SDK key (Android)
 */

/**
 * Release guard: store builds must never ship with a missing key, a
 * RevenueCat Test Store key ("test_…"), or a non-production web origin.
 * EAS sets EAS_BUILD_PROFILE / EAS_BUILD_PLATFORM during cloud builds, so a
 * bad configuration fails the build at config-evaluation time instead of
 * shipping a binary with a dead or sandboxed paywall.
 */
function assertProductionConfig(extra: {
  webUrl?: string;
  revenueCatIosApiKey?: string;
  revenueCatAndroidApiKey?: string;
}) {
  const platform = process.env.EAS_BUILD_PLATFORM; // "ios" | "android"
  const problems: string[] = [];

  const requireStoreKey = (key: string | undefined, name: string, prefix: string) => {
    if (!key) problems.push(`${name} is not set`);
    else if (key.startsWith("test_"))
      problems.push(`${name} is a RevenueCat Test Store key ("test_…") — production must use the ${prefix} key`);
    else if (!key.startsWith(prefix))
      problems.push(`${name} does not look like a RevenueCat ${prefix} public SDK key`);
  };

  if (platform !== "android") {
    requireStoreKey(extra.revenueCatIosApiKey, "FMA_REVENUECAT_IOS_API_KEY", "appl_");
  }
  if (platform !== "ios") {
    requireStoreKey(extra.revenueCatAndroidApiKey, "FMA_REVENUECAT_ANDROID_API_KEY", "goog_");
  }

  const webUrl = extra.webUrl ?? "";
  if (!/^https:\/\//.test(webUrl) || /localhost|127\.0\.0\.1|(^|\.)lovableproject\.com|-preview--/.test(webUrl)) {
    problems.push(`FMA_WEB_URL resolves to "${webUrl}" — production must load the https production origin`);
  }

  if (problems.length > 0) {
    throw new Error(
      `Refusing to build the production profile with invalid configuration:\n - ${problems.join("\n - ")}`,
    );
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const extra = {
    ...config.extra,
    webUrl: process.env.FMA_WEB_URL || config.extra?.webUrl,
    oneSignalAppId: process.env.FMA_ONESIGNAL_APP_ID || config.extra?.oneSignalAppId,
    revenueCatIosApiKey:
      process.env.FMA_REVENUECAT_IOS_API_KEY || config.extra?.revenueCatIosApiKey,
    revenueCatAndroidApiKey:
      process.env.FMA_REVENUECAT_ANDROID_API_KEY || config.extra?.revenueCatAndroidApiKey,
  };

  if (process.env.EAS_BUILD_PROFILE === "production") {
    assertProductionConfig(extra);
  }

  return {
    ...(config as ExpoConfig),
    extra,
  };
};
