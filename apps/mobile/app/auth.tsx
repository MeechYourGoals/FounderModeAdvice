import { useState } from "react";
import { Redirect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { NATIVE_OAUTH_REDIRECT } from "@foundermode/shared";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/auth/AuthProvider";

// Finishes an in-progress web auth session if the app was reopened mid-flow.
WebBrowser.maybeCompleteAuthSession();

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in (e.g. relaunch with a valid session): never show the form.
  if (!authLoading && session) {
    return <Redirect href="/home" />;
  }

  const submitEmail = async () => {
    if (!email || !password) {
      Alert.alert("Missing details", "Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const { error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (error) {
        Alert.alert(mode === "signin" ? "Sign in failed" : "Sign up failed", error.message);
      } else if (mode === "signup") {
        Alert.alert("Almost there", "Check your email to confirm your address, then sign in.");
      }
      // On a successful sign-in the auth listener flips `session`; index.tsx and
      // this screen both redirect into the app automatically.
    } finally {
      setBusy(false);
    }
  };

  const signInWithProvider = async (provider: "google" | "apple") => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: NATIVE_OAUTH_REDIRECT, skipBrowserRedirect: true },
      });
      if (error) {
        Alert.alert("Sign in failed", error.message);
        return;
      }
      if (!data?.url) return;

      const result = await WebBrowser.openAuthSessionAsync(data.url, NATIVE_OAUTH_REDIRECT);
      if (result.type !== "success" || !result.url) return;

      // PKCE: the provider returns ?code=... on the deep link; exchange it.
      const { queryParams } = Linking.parse(result.url);
      const code = typeof queryParams?.code === "string" ? queryParams.code : undefined;
      if (!code) {
        Alert.alert("Sign in failed", "No authorization code was returned.");
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        Alert.alert("Sign in failed", exchangeError.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Founder Mode Advice</Text>
        <Text style={styles.subtitle}>
          {mode === "signin" ? "Sign in to your library" : "Create your account"}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
            autoCapitalize="none"
          />

          <Pressable
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={submitEmail}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#0f1420" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === "signin" ? "Sign In" : "Sign Up"}
              </Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.line} />
          </View>

          <Pressable
            style={[styles.outlineBtn, busy && styles.btnDisabled]}
            onPress={() => signInWithProvider("google")}
            disabled={busy}
          >
            <Text style={styles.outlineBtnText}>Continue with Google</Text>
          </Pressable>

          {Platform.OS === "ios" && (
            <Pressable
              style={[styles.outlineBtn, busy && styles.btnDisabled]}
              onPress={() => signInWithProvider("apple")}
              disabled={busy}
            >
              <Text style={styles.outlineBtnText}>Continue with Apple</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          disabled={busy}
          hitSlop={12}
        >
          <Text style={styles.toggle}>
            {mode === "signin"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0f1420" },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "center" },
  brand: { color: "#f8fafc", fontSize: 26, fontWeight: "700", textAlign: "center" },
  subtitle: { color: "#94a3b8", fontSize: 15, textAlign: "center", marginTop: 6, marginBottom: 28 },
  card: {
    backgroundColor: "#172033",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f2b45",
  },
  label: { color: "#cbd5e1", fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#0f1726",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#243048",
    color: "#f8fafc",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryBtn: {
    backgroundColor: "#38bdf8",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnText: { color: "#0f1420", fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: "#243048" },
  dividerText: { color: "#64748b", fontSize: 12, marginHorizontal: 10, textTransform: "uppercase" },
  outlineBtn: {
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#33415c",
    marginTop: 10,
  },
  outlineBtnText: { color: "#e2e8f0", fontSize: 15, fontWeight: "600" },
  toggle: { color: "#38bdf8", fontSize: 14, textAlign: "center", marginTop: 22 },
});
