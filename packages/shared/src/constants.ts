/**
 * Capacitor bundle id / Despia package / Expo scheme — and the host of the native
 * OAuth redirect. Keeping this identical across every native path means the same
 * `com.foundermodeadvice.app://auth/callback` URL works for Capacitor, Despia, and
 * Expo, so it only has to be allow-listed in Supabase once.
 */
export const APP_BUNDLE_ID = "com.foundermodeadvice.app";

/** Native OAuth deep-link target. Must be allow-listed in Supabase → Auth → URL Configuration. */
export const NATIVE_OAUTH_REDIRECT = `${APP_BUNDLE_ID}://auth/callback`;

export const PRODUCTION_WEB_URL = "https://foundermodeadvice.com";
