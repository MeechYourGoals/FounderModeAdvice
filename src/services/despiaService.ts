import despia from 'despia-native';

export const isDespia = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Despia');
};

export const launchDespiaPaywall = (userId: string, offering: string): void => {
  if (isDespia()) {
    console.log(`Despia: Launching paywall for user ${userId} with offering ${offering}`);
    despia(`revenuecat://launchPaywall?external_id=${userId}&offering=${offering}`);
  } else {
    console.warn('Despia: Attempted to launch paywall in non-Despia environment');
  }
};

/**
 * Trigger native haptic feedback through the Despia runtime.
 * Safe to call from non-Despia contexts — it just no-ops.
 */
export const triggerDespiaHaptic = (type: 'light' | 'medium' | 'heavy' = 'light'): void => {
  if (!isDespia()) return;
  try {
    despia(`haptics://${type}`);
  } catch (err) {
    console.warn('Despia haptics failed', err);
  }
};

/**
 * Open a deep link through the Despia runtime so it routes inside the
 * installed app instead of bouncing out to Safari.
 */
export const openDespiaDeepLink = (url: string): void => {
  if (!isDespia()) return;
  try {
    despia(`deeplink://open?url=${encodeURIComponent(url)}`);
  } catch (err) {
    console.warn('Despia deeplink failed', err);
  }
};

/**
 * Register the current user with the native push token provider (OneSignal
 * bridged through Despia). External ID lets us target this user from the
 * send-daily-prompt edge function.
 */
export const registerDespiaPush = (externalId: string): void => {
  if (!isDespia()) return;
  try {
    despia(`push://register?external_id=${encodeURIComponent(externalId)}`);
  } catch (err) {
    console.warn('Despia push registration failed', err);
  }
};
