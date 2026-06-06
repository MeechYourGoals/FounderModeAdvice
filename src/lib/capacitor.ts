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
    // Status Bar - set style for iOS
    if (isIOS) {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Default });
    }

    // Keyboard - configure for proper form handling
    const { Keyboard } = await import('@capacitor/keyboard');

    // Optional: Listen for keyboard events
    Keyboard.addListener('keyboardWillShow', (info) => {
      console.log('Keyboard will show:', info.keyboardHeight);
    });

    Keyboard.addListener('keyboardWillHide', () => {
      console.log('Keyboard will hide');
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
        } catch (error) {
          console.error('Error completing OAuth sign in:', error);
        } finally {
          window.location.href = '/';
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

// Haptic feedback for native interactions
export async function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (!isNative) return;

  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');

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
