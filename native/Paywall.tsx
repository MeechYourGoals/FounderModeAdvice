import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import {
  DEFAULT_IAP_PLAN_ID,
  IAP_DISCLOSURE,
  IAP_LEGAL_URLS,
  IAP_PLANS,
  formatPlanPrice,
  matchOfferingPackage,
  planById,
  type IapPlanId,
  type OfferingPackageLike,
} from "./iapPaywallCatalog";

type PurchasesLike = {
  getOfferings: () => Promise<{
    current?: { availablePackages?: OfferingPackageLike[] } | null;
  }>;
  purchasePackage: (pkg: OfferingPackageLike) => Promise<unknown>;
  restorePurchases: () => Promise<unknown>;
};

type PaywallProps = {
  purchases: PurchasesLike | null;
  onDismiss: () => void;
  onSuccess: () => void;
};

function isUserCancelled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { userCancelled?: boolean; code?: string | number; message?: string };
  if (record.userCancelled) return true;
  const code = String(record.code ?? "");
  if (code === "1" || code === "PURCHASE_CANCELLED_ERROR") return true;
  return /cancel/i.test(record.message ?? "");
}

export function Paywall({ purchases, onDismiss, onSuccess }: PaywallProps) {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<IapPlanId>(DEFAULT_IAP_PLAN_ID);
  const [packages, setPackages] = useState<OfferingPackageLike[]>([]);
  const [busy, setBusy] = useState<"purchase" | "restore" | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!purchases) return;
    purchases
      .getOfferings()
      .then((offerings) => {
        if (cancelled) return;
        setPackages(offerings.current?.availablePackages ?? []);
      })
      .catch((err) => {
        console.warn("Paywall offerings failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [purchases]);

  const selected = planById(selectedId);
  const selectedPackage = useMemo(
    () => matchOfferingPackage(packages, selected),
    [packages, selected],
  );

  const openLegal = useCallback((url: string) => {
    void WebBrowser.openBrowserAsync(url).catch(() => {});
  }, []);

  const handlePurchase = useCallback(async () => {
    if (busy) return;
    if (!purchases) {
      Alert.alert(
        "Purchases unavailable",
        "In-app purchases need a store or development build.",
      );
      return;
    }
    if (!selectedPackage) {
      Alert.alert(
        "Plan unavailable",
        "This subscription is not available right now. Check your connection and try again.",
      );
      return;
    }
    setBusy("purchase");
    try {
      await purchases.purchasePackage(selectedPackage);
      onSuccess();
    } catch (error) {
      if (!isUserCancelled(error)) {
        const message = error instanceof Error ? error.message : "Could not complete the purchase.";
        Alert.alert("Purchase failed", message);
      }
    } finally {
      setBusy(null);
    }
  }, [busy, onSuccess, purchases, selectedPackage]);

  const handleRestore = useCallback(async () => {
    if (busy) return;
    if (!purchases) {
      Alert.alert(
        "Restore unavailable",
        "Restoring purchases needs a store or development build.",
      );
      return;
    }
    setBusy("restore");
    try {
      await purchases.restorePurchases();
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not restore purchases.";
      Alert.alert("Restore failed", message);
    } finally {
      setBusy(null);
    }
  }, [busy, onSuccess, purchases]);

  return (
    <View
      style={styles.root}
      testID="iap-paywall"
      accessibilityViewIsModal
      accessibilityLabel="Subscription options"
    >
      <View style={[styles.card, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.topBar}>
          <View style={styles.topBarSpacer} />
          <Pressable
            onPress={onDismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID="iap-paywall-close"
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Text style={styles.closeLabel}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("./assets/icon.png")}
            style={styles.icon}
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.appName} testID="iap-paywall-app-name">
            Founder Mode
          </Text>
          <Text style={styles.subtitle}>Monthly subscriptions</Text>

          <View style={styles.planList}>
            {IAP_PLANS.map((plan) => {
              const pkg = matchOfferingPackage(packages, plan);
              const selectedPlan = plan.id === selectedId;
              const price = formatPlanPrice(pkg?.product?.priceString, plan);
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedId(plan.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedPlan }}
                  accessibilityLabel={`${plan.displayName}, ${plan.length}, ${price}`}
                  testID={`iap-paywall-plan-${plan.id}`}
                  style={({ pressed }) => [
                    styles.planRow,
                    selectedPlan ? styles.planRowSelected : styles.planRowIdle,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[styles.radio, selectedPlan ? styles.radioSelected : styles.radioIdle]}
                  >
                    {selectedPlan ? <Text style={styles.radioCheck}>✓</Text> : null}
                  </View>
                  <View style={styles.planText}>
                    <Text style={[styles.planName, selectedPlan && styles.planNameSelected]}>
                      {plan.displayName}
                    </Text>
                    <Text style={[styles.planLength, selectedPlan && styles.planLengthSelected]}>
                      {plan.length}
                    </Text>
                  </View>
                  <Text
                    style={[styles.planPrice, selectedPlan && styles.planPriceSelected]}
                    testID={`iap-paywall-price-${plan.id}`}
                  >
                    {price}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.featuresBox} testID="iap-paywall-features">
            <Text style={styles.featuresHeading}>
              {selected.displayName} — {selected.length} —{" "}
              {formatPlanPrice(selectedPackage?.product?.priceString, selected)}
            </Text>
            {selected.features.map((feature) => (
              <Text key={feature} style={styles.featureLine}>
                {`•  ${feature}`}
              </Text>
            ))}
          </View>

          <Text style={styles.disclosure} testID="iap-paywall-auto-renew">
            {IAP_DISCLOSURE.autoRenew}
          </Text>
          <Text style={styles.disclosure} testID="iap-paywall-cancel">
            {IAP_DISCLOSURE.cancel}
          </Text>

          <View style={styles.legalRow}>
            <Pressable
              onPress={() => openLegal(IAP_LEGAL_URLS.privacy)}
              accessibilityRole="link"
              accessibilityLabel="Privacy Policy"
              testID="iap-paywall-privacy"
              style={({ pressed }) => [styles.legalLink, pressed && styles.pressed]}
            >
              <Text style={styles.legalLabel}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable
              onPress={() => openLegal(IAP_LEGAL_URLS.terms)}
              accessibilityRole="link"
              accessibilityLabel="Terms of Use (EULA)"
              testID="iap-paywall-terms"
              style={({ pressed }) => [styles.legalLink, pressed && styles.pressed]}
            >
              <Text style={styles.legalLabel}>Terms of Use (EULA)</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => void handlePurchase()}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Purchase"
            testID="iap-paywall-purchase"
            style={({ pressed }) => [
              styles.purchaseButton,
              (pressed || busy === "purchase") && styles.pressed,
              busy !== null && styles.purchaseDisabled,
            ]}
          >
            {busy === "purchase" ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.purchaseLabel}>Purchase</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => void handleRestore()}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
            testID="iap-paywall-restore"
            style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed]}
          >
            {busy === "restore" ? (
              <ActivityIndicator color="#1a1a1a" />
            ) : (
              <Text style={styles.restoreLabel}>Restore purchases</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const BRAND_RED = "#C92232";
const PINK_BG = "#F8E4E6";

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 16, 18, 0.28)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 50,
  },
  card: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    maxHeight: "96%",
    marginVertical: 12,
    backgroundColor: PINK_BG,
    borderRadius: 28,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    minHeight: 44,
  },
  topBarSpacer: { flex: 1 },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeLabel: { fontSize: 14, color: "#1a1a1a", fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 22,
    alignItems: "center",
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginTop: 4,
  },
  appName: {
    marginTop: 14,
    fontSize: 26,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 22,
    fontSize: 15,
    color: "#5c5c5c",
    fontWeight: "500",
  },
  planList: {
    width: "100%",
    gap: 12,
  },
  planRow: {
    width: "100%",
    minHeight: 64,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planRowSelected: { backgroundColor: BRAND_RED },
  planRowIdle: { backgroundColor: "#E8E8E8" },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  radioSelected: { borderColor: "#ffffff", backgroundColor: "#ffffff" },
  radioIdle: { borderColor: "#8a8a8a", backgroundColor: "transparent" },
  radioCheck: { color: BRAND_RED, fontSize: 13, fontWeight: "700", lineHeight: 16 },
  planText: { flex: 1 },
  planName: { fontSize: 17, fontWeight: "700", color: "#111111" },
  planNameSelected: { color: "#ffffff" },
  planLength: { marginTop: 2, fontSize: 13, fontWeight: "500", color: "#5c5c5c" },
  planLengthSelected: { color: "rgba(255,255,255,0.88)" },
  planPrice: { fontSize: 17, fontWeight: "700", color: "#111111" },
  planPriceSelected: { color: "#ffffff" },
  featuresBox: {
    width: "100%",
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.62)",
  },
  featuresHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 10,
  },
  featureLine: {
    fontSize: 14,
    lineHeight: 21,
    color: "#2a2a2a",
    marginBottom: 4,
  },
  disclosure: {
    width: "100%",
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    color: "#3a3a3a",
  },
  legalRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  legalLink: { paddingVertical: 4 },
  legalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    textDecorationLine: "underline",
  },
  legalDot: { color: "#6a6a6a", fontSize: 14 },
  purchaseButton: {
    width: "100%",
    marginTop: 20,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: BRAND_RED,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseDisabled: { opacity: 0.7 },
  purchaseLabel: { color: "#ffffff", fontSize: 18, fontWeight: "700" },
  restoreButton: {
    marginTop: 14,
    paddingVertical: 8,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  restoreLabel: { fontSize: 16, color: "#111111", fontWeight: "500" },
  pressed: { opacity: 0.82 },
});
