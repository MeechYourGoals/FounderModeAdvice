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
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  extra: {
    ...config.extra,
    webUrl: process.env.FMA_WEB_URL || config.extra?.webUrl,
    oneSignalAppId: process.env.FMA_ONESIGNAL_APP_ID || config.extra?.oneSignalAppId,
    revenueCatIosApiKey:
      process.env.FMA_REVENUECAT_IOS_API_KEY || config.extra?.revenueCatIosApiKey,
    revenueCatAndroidApiKey:
      process.env.FMA_REVENUECAT_ANDROID_API_KEY || config.extra?.revenueCatAndroidApiKey,
  },
});
