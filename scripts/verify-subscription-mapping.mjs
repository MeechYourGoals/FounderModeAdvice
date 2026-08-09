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

console.log(`Verified ${requiredMappings.size} RevenueCat identifier mappings across client and edge functions.`);
