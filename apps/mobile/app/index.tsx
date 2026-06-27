import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../src/auth/AuthProvider";

/**
 * App entry — the native equivalent of the web's `Index.tsx` decision.
 *
 * An installed app opens here and routes straight to login or the app shell; it
 * never shows a marketing page (that's web-only). While the session restores we
 * render a spinner so nothing flashes before the decision is made.
 */
export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f1420" }}>
        <ActivityIndicator color="#38bdf8" size="large" />
      </View>
    );
  }

  return <Redirect href={session ? "/home" : "/auth"} />;
}
