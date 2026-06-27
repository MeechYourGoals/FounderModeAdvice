import "react-native-url-polyfill/auto";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/auth/AuthProvider";

/**
 * Root layout. Wraps the whole app in the session provider, so every route can
 * read auth state from one listener. No navigation is declared here beyond the
 * stack — the auth-first decision happens in `app/index.tsx`.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0f1420" },
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
