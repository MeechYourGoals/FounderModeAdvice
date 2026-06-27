import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider";

/**
 * Authenticated home — intentionally a stub. The web app's full feature set
 * (analysis, library, paywall, settings, sharing) is the documented follow-up;
 * this proves the auth-first entry, session restore, and sign-out round-trip.
 */
export default function Home() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
    >
      <Text style={styles.kicker}>Founder Mode Advice</Text>
      <Text style={styles.title}>You're signed in</Text>
      <Text style={styles.body}>
        {user?.email ? `Signed in as ${user.email}.` : "Session active."} The native
        app shell is wired up — feature screens are the next step.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coming next</Text>
        <Text style={styles.cardItem}>• Video analysis & operating memos</Text>
        <Text style={styles.cardItem}>• Saved library & folders</Text>
        <Text style={styles.cardItem}>• Subscription / paywall (RevenueCat)</Text>
        <Text style={styles.cardItem}>• Settings & account</Text>
      </View>

      <Pressable style={styles.signOut} onPress={signOut} hitSlop={8}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0f1420" },
  content: { paddingHorizontal: 24 },
  kicker: { color: "#38bdf8", fontSize: 13, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: "#f8fafc", fontSize: 28, fontWeight: "700", marginTop: 8 },
  body: { color: "#94a3b8", fontSize: 15, lineHeight: 22, marginTop: 12 },
  card: {
    backgroundColor: "#172033",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f2b45",
    padding: 18,
    marginTop: 28,
  },
  cardTitle: { color: "#e2e8f0", fontSize: 16, fontWeight: "700", marginBottom: 10 },
  cardItem: { color: "#94a3b8", fontSize: 14, lineHeight: 24 },
  signOut: {
    marginTop: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#33415c",
    paddingVertical: 13,
    alignItems: "center",
  },
  signOutText: { color: "#e2e8f0", fontSize: 15, fontWeight: "600" },
});
