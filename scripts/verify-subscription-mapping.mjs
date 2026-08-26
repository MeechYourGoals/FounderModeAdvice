import { readFileSync } from 'node:fs';

const clientSource = readFileSync(new URL('../src/types/subscription.ts', import.meta.url), 'utf8');
// The edge-side map lives in the shared module used by BOTH the
// sync-revenuecat-subscription function and the revenuecat-webhook function.
const edgeSource = readFileSync(new URL('../supabase/functions/_shared/revenuecat.ts', import.meta.url), 'utf8');
const syncSource = readFileSync(new URL('../supabase/functions/sync-revenuecat-subscription/index.ts', import.meta.url), 'utf8');
const webhookSource = readFileSync(new URL('../supabase/functions/revenuecat-webhook/index.ts', import.meta.url), 'utf8');

const requiredMappings = new Map([
  ['Founder Mode Advisor Pro', 'series_z'],
  ['founder_mode_advisor_pro', 'series_z'],
  ['series_z_subscription', 'series_z'],
  ['series_z_monthly', 'series_z'],
  ['seed_subscription', 'seed'],
  ['seed_monthly', 'seed'],
]);

function assertContains(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`${label} is missing ${JSON.stringify(needle)}`);
  }
}

for (const [identifier, tier] of requiredMappings) {
  assertContains(clientSource, identifier, 'client subscription mapping');
  assertContains(clientSource, `'${tier}'`, `client tier for ${identifier}`);
  assertContains(edgeSource, identifier, 'edge subscription mapping');
  assertContains(edgeSource, `"${tier}"`, `edge tier for ${identifier}`);
}

const requiredClientHelpers = [
  'REVENUECAT_TIER_IDENTIFIERS',
  'pickHighestSubscriptionTier',
  "if (tiers.includes('series_z')) return 'series_z';",
  "if (tiers.includes('seed')) return 'seed';",
  "return 'free';",
];

for (const helper of requiredClientHelpers) {
  assertContains(clientSource, helper, 'client subscription helpers');
}

// Both entitlement-writing functions must consume the shared verifier so the
// map can never fork between them again.
assertContains(syncSource, 'syncUserEntitlements', 'sync function');
assertContains(syncSource, '_shared/revenuecat.ts', 'sync function import');
assertContains(webhookSource, 'syncUserEntitlements', 'webhook function');
assertContains(webhookSource, '_shared/revenuecat.ts', 'webhook function import');

// Native IAP overlay must keep the same live SKUs, prices, and feature lists
// as the website (Guideline 3.1.2(c) — do not invent new products or prices).
const paywallCatalog = readFileSync(new URL('../native/iapPaywallCatalog.ts', import.meta.url), 'utf8');
const paywallUi = readFileSync(new URL('../native/Paywall.tsx', import.meta.url), 'utf8');
const nativeApp = readFileSync(new URL('../native/App.tsx', import.meta.url), 'utf8');
const shellBridge = readFileSync(new URL('../src/services/expoShellService.ts', import.meta.url), 'utf8');
const subscriptionService = readFileSync(new URL('../src/services/subscriptionService.ts', import.meta.url), 'utf8');

assertContains(paywallCatalog, "productId: \"seed_monthly\"", 'native IAP catalog C-Suite SKU');
assertContains(paywallCatalog, "productId: \"series_z_monthly\"", 'native IAP catalog Boardroom SKU');
assertContains(paywallCatalog, "$9.99/month", 'native IAP catalog C-Suite price');
assertContains(paywallCatalog, "$19.99/month", 'native IAP catalog Boardroom price');
assertContains(paywallCatalog, "The C-Suite", 'native IAP catalog C-Suite name');
assertContains(paywallCatalog, "The Boardroom", 'native IAP catalog Boardroom name');
assertContains(paywallCatalog, "Auto-renews until canceled.", 'native IAP auto-renew copy');
assertContains(paywallCatalog, "Settings → Subscriptions", 'native IAP cancel path');
assertContains(paywallCatalog, "one tap in in-app Settings", 'native IAP in-app cancel path');
assertContains(paywallCatalog, "https://foundermodeadvice.com/privacy-policy", 'native IAP privacy URL');
assertContains(paywallCatalog, "https://foundermodeadvice.com/terms-of-service", 'native IAP terms URL');

const extractTierFeatures = (source, displayName) => {
  const block = source.split(`displayName: '${displayName}'`)[1];
  if (!block) throw new Error(`Could not find TIER_PRICING block for ${displayName}`);
  const featuresBlock = block.split('features: [')[1]?.split('],')[0];
  if (!featuresBlock) throw new Error(`Could not find features for ${displayName}`);
  return [...featuresBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

for (const displayName of ['The C-Suite', 'The Boardroom']) {
  const features = extractTierFeatures(clientSource, displayName);
  if (features.length === 0) {
    throw new Error(`No live-site features extracted for ${displayName}`);
  }
  for (const feature of features) {
    assertContains(paywallCatalog, feature, `native IAP catalog feature for ${displayName}`);
  }
}

assertContains(paywallUi, "iap-paywall-purchase", 'native paywall Purchase control');
assertContains(paywallUi, "Continue with {selected.displayName}", 'native paywall visible plan-specific CTA');
assertContains(paywallUi, "iap-paywall-restore", 'native paywall Restore control');
assertContains(paywallUi, "Terms of Use (EULA)", 'native paywall EULA link');
assertContains(paywallUi, "Privacy Policy", 'native paywall privacy link');

const disclosureOrder = [
  'iap-paywall-features',
  'iap-paywall-auto-renew',
  'iap-paywall-cancel',
  'iap-paywall-privacy',
  'iap-paywall-terms',
  'iap-paywall-purchase',
];
const disclosureIndexes = disclosureOrder.map((id) => paywallUi.indexOf(id));
if (disclosureIndexes.some((index) => index < 0) || disclosureIndexes.some((index, i) => i > 0 && index < disclosureIndexes[i - 1])) {
  throw new Error('Guideline 3.1.2(c) disclosures must appear in the paywall before Purchase');
}
assertContains(nativeApp, 'from "./Paywall"', 'Expo shell presents the in-app paywall');
assertContains(nativeApp, '__fmaShellPaywallResult', 'Expo shell acknowledges a visible paywall');
assertContains(nativeApp, 'initialPlanId={paywallPlanId}', 'Expo shell opens the selected plan');
assertContains(shellBridge, 'launchShellPaywallAndWait', 'web waits for native paywall acknowledgement');
assertContains(shellBridge, 'if (!bridge || typeof bridge.postMessage !== "function") return false;', 'web rejects a missing native bridge');
assertContains(subscriptionService, 'presentPaywallForTier', 'upgrade buttons route the selected tier');
assertContains(subscriptionService, 'REVENUECAT_ENTITLEMENTS.SEED', 'C-Suite uses the live entitlement');
assertContains(subscriptionService, 'REVENUECAT_ENTITLEMENTS.SERIES_Z', 'Boardroom uses the live entitlement');
if (nativeApp.includes("RevenueCatUI.presentPaywall")) {
  throw new Error("Expo shell still presents the default RevenueCat paywall picker");
}

console.log(`Verified ${requiredMappings.size} RevenueCat identifier mappings across client and edge functions.`);
console.log("Verified native IAP paywall catalog matches live TIER_PRICING SKUs, prices, and features.");
