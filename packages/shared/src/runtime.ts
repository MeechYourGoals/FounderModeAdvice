/**
 * The distinct runtimes the product can be opened from. The web app derives this
 * in `src/lib/appMode.ts`; the Expo app is always one of the two native values.
 * Kept here so both sides speak the same vocabulary (analytics, gating, types).
 */
export type RuntimeSurface =
  | "native-ios"
  | "native-android"
  | "web-desktop"
  | "web-mobile-browser"
  | "web-pwa";

export const isNativeSurface = (surface: RuntimeSurface): boolean =>
  surface === "native-ios" || surface === "native-android";
