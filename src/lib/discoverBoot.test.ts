import assert from "node:assert/strict";
import { resolveDiscoverBoot, resolveDiscoverForYou } from "@/lib/discoverBoot.ts";

Deno.test("boot — auth restore is the only full-page spinner", () => {
  assert.equal(
    resolveDiscoverBoot({ authLoading: true, hasUser: false, hasBootstrapped: false, timedOut: false }),
    "spinner",
  );
});

Deno.test("boot — signed-out users go to auth even if other flags are still loading", () => {
  assert.equal(
    resolveDiscoverBoot({ authLoading: false, hasUser: false, hasBootstrapped: false, timedOut: false }),
    "redirect-auth",
  );
});

Deno.test("boot — after auth, Discover renders chrome instead of waiting on subscription/profiles", () => {
  assert.equal(
    resolveDiscoverBoot({ authLoading: false, hasUser: true, hasBootstrapped: false, timedOut: false }),
    "page",
  );
});

Deno.test("boot — a later loading flap does not remount the spinner", () => {
  assert.equal(
    resolveDiscoverBoot({ authLoading: true, hasUser: true, hasBootstrapped: true, timedOut: false }),
    "page",
  );
});

Deno.test("boot — timeout with a session still shows the page (error lives in For You)", () => {
  assert.equal(
    resolveDiscoverBoot({ authLoading: true, hasUser: true, hasBootstrapped: false, timedOut: true }),
    "page",
  );
});

Deno.test("boot — timeout with no session sends the user to sign-in", () => {
  assert.equal(
    resolveDiscoverBoot({ authLoading: true, hasUser: false, hasBootstrapped: false, timedOut: true }),
    "redirect-auth",
  );
});

Deno.test("for-you — Boardroom member with profiles and no batches is the empty feed, not a spinner", () => {
  assert.equal(
    resolveDiscoverForYou({
      subscriptionLoading: false,
      hasSubscription: true,
      subscriptionError: false,
      isPremium: true,
      profilesLoading: false,
      profileCount: 2,
      feedLoading: false,
      feedError: false,
      timedOut: false,
    }),
    "feed",
  );
});

Deno.test("for-you — free users see the upgrade wall once the tier is known", () => {
  assert.equal(
    resolveDiscoverForYou({
      subscriptionLoading: false,
      hasSubscription: true,
      subscriptionError: false,
      isPremium: false,
      profilesLoading: true,
      profileCount: 0,
      feedLoading: true,
      feedError: false,
      timedOut: false,
    }),
    "upgrade",
  );
});

Deno.test("for-you — unknown subscription stays on a skeleton until timeout, then an error", () => {
  const loading = {
    subscriptionLoading: true,
    hasSubscription: false,
    subscriptionError: false,
    isPremium: false,
    profilesLoading: true,
    profileCount: 0,
    feedLoading: false,
    feedError: false,
    timedOut: false,
  };
  assert.equal(resolveDiscoverForYou(loading), "skeleton");
  assert.equal(resolveDiscoverForYou({ ...loading, timedOut: true }), "boot-error");
});

Deno.test("for-you — a failed subscription fetch is retryable, not a free-tier wall", () => {
  assert.equal(
    resolveDiscoverForYou({
      subscriptionLoading: false,
      hasSubscription: false,
      subscriptionError: true,
      isPremium: false,
      profilesLoading: false,
      profileCount: 0,
      feedLoading: false,
      feedError: false,
      timedOut: false,
    }),
    "boot-error",
  );
});

Deno.test("for-you — profiles still loading do not look like 'create a profile'", () => {
  assert.equal(
    resolveDiscoverForYou({
      subscriptionLoading: false,
      hasSubscription: true,
      subscriptionError: false,
      isPremium: true,
      profilesLoading: true,
      profileCount: 0,
      feedLoading: false,
      feedError: false,
      timedOut: false,
    }),
    "skeleton",
  );
});

Deno.test("for-you — a hung profile fetch becomes an error instead of a spinner", () => {
  assert.equal(
    resolveDiscoverForYou({
      subscriptionLoading: false,
      hasSubscription: true,
      subscriptionError: false,
      isPremium: true,
      profilesLoading: true,
      profileCount: 0,
      feedLoading: false,
      feedError: false,
      timedOut: true,
    }),
    "boot-error",
  );
});

Deno.test("for-you — feed fetch errors stay on the page with retry", () => {
  assert.equal(
    resolveDiscoverForYou({
      subscriptionLoading: false,
      hasSubscription: true,
      subscriptionError: false,
      isPremium: true,
      profilesLoading: false,
      profileCount: 1,
      feedLoading: false,
      feedError: true,
      timedOut: false,
    }),
    "feed-error",
  );
});
