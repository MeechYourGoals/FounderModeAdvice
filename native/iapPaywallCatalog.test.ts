import assert from "node:assert/strict";
import {
  DEFAULT_IAP_PLAN_ID,
  IAP_DISCLOSURE,
  IAP_LEGAL_URLS,
  IAP_PLANS,
  customerHasEntitlement,
  formatPlanPrice,
  matchOfferingPackage,
  planById,
} from "./iapPaywallCatalog.ts";

Deno.test("IAP catalog covers both live monthly products with required disclosures", () => {
  assert.deepEqual(
    IAP_PLANS.map((plan) => plan.productId),
    ["series_z_monthly", "seed_monthly"],
  );
  assert.equal(planById("series_z").displayName, "The Boardroom");
  assert.equal(planById("seed").displayName, "The C-Suite");
  assert.equal(planById("series_z").length, "Monthly");
  assert.equal(planById("seed").length, "Monthly");
  assert.equal(planById("series_z").priceDisplay, "$19.99/month");
  assert.equal(planById("seed").priceDisplay, "$9.99/month");
  assert.equal(DEFAULT_IAP_PLAN_ID, "series_z");
  assert.ok(planById("series_z").features.length >= 8);
  assert.ok(planById("seed").features.length >= 5);
  assert.equal(IAP_DISCLOSURE.autoRenew, "Auto-renews until canceled.");
  assert.match(IAP_DISCLOSURE.cancel, /Settings → Subscriptions/);
  assert.match(IAP_DISCLOSURE.cancel, /one tap in in-app Settings/);
  assert.equal(IAP_LEGAL_URLS.privacy, "https://foundermodeadvice.com/privacy-policy");
  assert.equal(IAP_LEGAL_URLS.terms, "https://foundermodeadvice.com/terms-of-service");
});

Deno.test("formatPlanPrice prefers StoreKit price and always states monthly", () => {
  const boardroom = planById("series_z");
  assert.equal(formatPlanPrice("$19.99", boardroom), "$19.99/month");
  assert.equal(formatPlanPrice("US$19.99", boardroom), "US$19.99/month");
  assert.equal(formatPlanPrice("$19.99/month", boardroom), "$19.99/month");
  assert.equal(formatPlanPrice(undefined, boardroom), "$19.99/month");
  assert.equal(formatPlanPrice("  $9.99  ", planById("seed")), "$9.99/month");
});

Deno.test("matchOfferingPackage prefers product id then package aliases", () => {
  const packages = [
    { identifier: "$rc_monthly", product: { identifier: "series_z_monthly", priceString: "$19.99" } },
    { identifier: "c_suite_monthly", product: { identifier: "seed_monthly", priceString: "$9.99" } },
  ];
  assert.equal(
    matchOfferingPackage(packages, planById("series_z"))?.product?.identifier,
    "series_z_monthly",
  );
  assert.equal(
    matchOfferingPackage(packages, planById("seed"))?.product?.identifier,
    "seed_monthly",
  );
  assert.equal(
    matchOfferingPackage(
      [{ identifier: "c_suite_monthly", product: { identifier: "other" } }],
      planById("seed"),
    )?.identifier,
    "c_suite_monthly",
  );
  assert.equal(matchOfferingPackage([], planById("seed")), null);
});

Deno.test("customerHasEntitlement treats Boardroom aliases as the same plan", () => {
  assert.equal(customerHasEntitlement(["series_z_subscription"], "Founder Mode Advisor Pro"), true);
  assert.equal(customerHasEntitlement(["founder_mode_advisor_pro"], "series_z_subscription"), true);
  assert.equal(customerHasEntitlement(["seed_subscription"], "Founder Mode Advisor Pro"), false);
  assert.equal(customerHasEntitlement([], "Founder Mode Advisor Pro"), false);
  assert.equal(customerHasEntitlement(["series_z_subscription"]), false);
});
