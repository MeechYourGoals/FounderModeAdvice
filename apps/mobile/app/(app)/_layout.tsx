import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/auth/AuthProvider";

/**
 * Guard for the authenticated area. An expired/absent session bounces back to the
 * login screen; while restoring we hold on a spinner rather than flashing content.
 */
export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f1420" }}>
        <ActivityIndicator color="#38bdf8" size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/auth" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
