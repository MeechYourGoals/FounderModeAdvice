import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// Platform detection
export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isWeb = Capacitor.getPlatform() === 'web';

// Initialize native plugins
export async function initializeNativePlugins() {
  if (!isNative) {
    console.log('Running on web, skipping native plugin initialization');
    return;
  }

  try {
    // Status Bar - follow the active theme (and keep following it on toggle)
    await syncStatusBarWithTheme();
    watchThemeForStatusBar();

    // Keyboard - hide the bottom tab bar while typing (see index.css .keyboard-open)
    const { Keyboard } = await import('@capacitor/keyboard');

    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });

    // App lifecycle handling
    const { App } = await import('@capacitor/app');

    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed:', isActive ? 'active' : 'background');
    });

    App.addListener('appUrlOpen', async ({ url }) => {
      console.log('App opened with URL:', url);
      // Complete OAuth: the provider redirects to com.foundermodeadvice.app://auth/callback
      // with a PKCE code; exchange it for a session, then route into the app.
      if (url.includes('auth/callback')) {
        try {
          await supabase.auth.exchangeCodeForSession(url);
          // Success: land on the app shell (Index routes signed-in users in).
          window.location.href = '/';
        } catch (error) {
          // Failure: return to the auth screen so the user can retry, instead of
          // bouncing through the marketing/app shell with no session.
          console.error('Error completing OAuth sign in:', error);
          window.location.href = '/auth';
        }
      }
    });

    // Hide splash screen after app is ready
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();

    console.log('Native plugins initialized successfully');
  } catch (error) {
    console.error('Error initializing native plugins:', error);
  }
}

// Status bar follows the app theme: light icons on the dark theme,
// dark icons on the light theme. Colors match --background in index.css.
async function syncStatusBarWithTheme() {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const darkTheme = document.documentElement.classList.contains('dark');

    await StatusBar.setStyle({ style: darkTheme ? Style.Dark : Style.Light });
    if (isAndroid) {
      await StatusBar.setBackgroundColor({ color: darkTheme ? '#0c0e15' : '#fbfcfe' });
    }
  } catch (error) {
    console.log('Status bar styling not available');
  }
}

// next-themes swaps the "dark" class on <html> when the user toggles theme
function watchThemeForStatusBar() {
  const observer = new MutationObserver(() => syncStatusBarWithTheme());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

/**
 * Keyboard detection for non-Capacitor wrappers (Despia, installed PWA, plain
 * mobile browser): the on-screen keyboard shrinks the visual viewport, so a
 * large height drop means the keyboard is up. Toggles the same body class the
 * Capacitor Keyboard plugin uses, so index.css handles both paths.
 */
export function initKeyboardViewportWatcher() {
  if (isNative || typeof window === 'undefined' || !window.visualViewport) return;

  const viewport = window.visualViewport;
  const onResize = () => {
    const keyboardLikelyOpen = window.innerHeight - viewport.height > 150;
    document.body.classList.toggle('keyboard-open', keyboardLikelyOpen);
  };
  viewport.addEventListener('resize', onResize);
}

// Handle back button on Android
export async function handleBackButton() {
  if (!isAndroid) return;

  try {
    const { App } = await import('@capacitor/app');

    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch (error) {
    console.error('Error setting up back button handler:', error);
  }
}


/**
 * Haptic feedback for native interactions (Capacitor or Despia runtime).
 *
 * Impact types (light/medium/heavy) are physical taps for direct
 * manipulation. Notification types (success/warning/error) are the richer
 * UIKit patterns for outcomes — use `success` when something the user
 * initiated finishes (analysis complete, folder saved, share sent).
 */
export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export async function triggerHapticFeedback(type: HapticType = 'light') {
  if (!isNative) {
    const { isExpoShell, triggerShellHaptic } = await import('@/services/expoShellService');
    if (isExpoShell()) {
      triggerShellHaptic(type);
      return;
    }

    const { isDespia, triggerDespiaHaptic } = await import('@/services/despiaService');
    // Despia only speaks impact strengths; map outcome patterns to the
    // closest physical equivalent.
    const despiaMap = {
      light: 'light',
      medium: 'medium',
      heavy: 'heavy',
      success: 'heavy',
      warning: 'medium',
      error: 'heavy',
    } as const;
    if (isDespia()) triggerDespiaHaptic(despiaMap[type]);
    return;
  }

  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');

    if (type === 'success' || type === 'warning' || type === 'error') {
      const notificationMap = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      };
      await Haptics.notification({ type: notificationMap[type] });
      return;
    }

    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };

    await Haptics.impact({ style: styleMap[type] });
  } catch (error) {
    // Haptics may not be available on all devices
    console.log('Haptics not available');
  }
}
