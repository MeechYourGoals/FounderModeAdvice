import { Capacitor } from "@capacitor/core";
import { isDespia, registerDespiaPush } from "@/services/despiaService";

/**
 * Push notification registration + per-user mapping.
 *
 * The `send-daily-prompt` edge function targets users with
 * `include_external_user_ids = [Supabase user id]`, so each device must register
 * its signed-in user id as the push provider's external id, or sends reach nobody.
 *
 * - Despia native runtime → native OneSignal via the `push://register` bridge.
 * - Capacitor builds → OneSignal web SDK (`react-onesignal`).
 * - Plain browser / preview → no-op.
 */

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;

/** Installed-app runtimes where push registration is meaningful. */
function inInstalledApp(): boolean {
  return isDespia() || Capacitor.isNativePlatform();
}

type OneSignalSDK = {
  init: (options: { appId: string } & Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
};

let oneSignalReady: Promise<OneSignalSDK | null> | null = null;

/**
 * Initialize the OneSignal web SDK exactly once. Despia bridges native OneSignal
 * separately (see syncPushUser), so the web SDK is only loaded for Capacitor
 * builds; everywhere else this resolves to null.
 */
export function initPushNotifications(): Promise<OneSignalSDK | null> {
  if (oneSignalReady) return oneSignalReady;

  if (isDespia() || !Capacitor.isNativePlatform() || !ONESIGNAL_APP_ID) {
    if (Capacitor.isNativePlatform() && !isDespia() && !ONESIGNAL_APP_ID) {
      console.log("OneSignal: VITE_ONESIGNAL_APP_ID not set — skipping push init");
    }
    oneSignalReady = Promise.resolve(null);
    return oneSignalReady;
  }

  oneSignalReady = import("react-onesignal")
    .then(async ({ default: OneSignal }) => {
      const sdk = OneSignal as unknown as OneSignalSDK;
      await sdk.init({ appId: ONESIGNAL_APP_ID });
      console.log("OneSignal: initialized");
      return sdk;
    })
    .catch((err) => {
      console.warn("OneSignal init failed", err);
      return null;
    });

  return oneSignalReady;
}

/**
 * Map the signed-in user to the push provider's external user id (pass null on
 * sign-out). No-op outside installed-app runtimes.
 */
export async function syncPushUser(userId: string | null | undefined): Promise<void> {
  if (!inInstalledApp()) return;

  // Despia → native OneSignal external id via bridge (no logout bridge exposed).
  if (isDespia()) {
    if (userId) registerDespiaPush(userId);
    return;
  }

  // Capacitor → react-onesignal web SDK.
  try {
    const sdk = await initPushNotifications();
    if (!sdk) return;
    if (userId) await sdk.login(userId);
    else await sdk.logout();
  } catch (err) {
    if (import.meta.env.DEV) console.warn("OneSignal user sync failed", err);
  }
}
