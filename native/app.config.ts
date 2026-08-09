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
export default ({ config }: ConfigContext): ExpoConfig => {
  const profile = process.env.EAS_BUILD_PROFILE;
  const webUrl = process.env.FMA_WEB_URL || config.extra?.webUrl;
  const iosKey = process.env.FMA_REVENUECAT_IOS_API_KEY || config.extra?.revenueCatIosApiKey;

  if (profile === "production") {
    if (webUrl !== "https://foundermodeadvice.com") {
      throw new Error("Production builds must use https://foundermodeadvice.com");
    }
    if (!iosKey || !String(iosKey).startsWith("appl_") || String(iosKey).startsWith("test_")) {
      throw new Error("Production iOS builds require the Apple app-specific RevenueCat public SDK key (appl_…). Test Store keys are forbidden.");
    }
  }

  return {
    ...(config as ExpoConfig),
    extra: {
    ...config.extra,
    appEnvironment: process.env.FMA_APP_ENV || "development",
    webUrl,
    oneSignalAppId: process.env.FMA_ONESIGNAL_APP_ID || config.extra?.oneSignalAppId,
    revenueCatIosApiKey:
      iosKey,
    revenueCatAndroidApiKey:
      process.env.FMA_REVENUECAT_ANDROID_API_KEY || config.extra?.revenueCatAndroidApiKey,
    },
  };
};
