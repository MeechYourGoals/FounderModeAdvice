import { Platform } from "react-native";
import type { RuntimeSurface } from "@foundermode/shared";

/**
 * In the Expo app the runtime is always native — this just resolves iOS vs Android.
 * The web app's richer browser/PWA detection lives in the web `src/lib/appMode.ts`.
 */
export const getRuntimeSurface = (): RuntimeSurface =>
  Platform.OS === "android" ? "native-android" : "native-ios";
