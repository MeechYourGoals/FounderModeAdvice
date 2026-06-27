import type { ExpoConfig } from "expo/config";

/**
 * Dynamic Expo config. Native identifiers match the Capacitor/Despia build so one
 * Supabase OAuth redirect (`com.foundermodeadvice.app://auth/callback`) and one App
 * Store / Play listing serve every native path.
 *
 * `EAS_PROJECT_ID` is filled in by `eas init` (or set in the build env). Public
 * Supabase config comes from `EXPO_PUBLIC_*` env vars (see .env.example).
 *
 * Icons/splash use Expo defaults for now; add real assets under ./assets and wire
 * `icon`, `splash`, and `android.adaptiveIcon` before submitting to the stores.
 */
const config: ExpoConfig = {
  name: "Founder Mode Advice",
  slug: "founder-mode-advice",
  scheme: "com.foundermodeadvice.app",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "com.foundermodeadvice.app",
    supportsTablet: true,
  },
  android: {
    package: "com.foundermodeadvice.app",
  },
  plugins: ["expo-router", "expo-secure-store"],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? "",
    },
  },
};

export default config;
