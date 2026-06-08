import { readFileSync } from 'node:fs';

const clientSource = readFileSync(new URL('../src/types/subscription.ts', import.meta.url), 'utf8');
const edgeSource = readFileSync(new URL('../supabase/functions/sync-revenuecat-subscription/index.ts', import.meta.url), 'utf8');

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

console.log(`Verified ${requiredMappings.size} RevenueCat identifier mappings across client and edge function.`);
