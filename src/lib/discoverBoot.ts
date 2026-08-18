/**
 * Boot and For You phases for /discover.
 *
 * Home only waits on auth, then renders the briefing teaser even while
 * subscription/profile fetches are in flight. Discover used to gate the whole
 * page on those extra flags, so a hung or flapping load painted
 * "Opening your briefing…" forever. These helpers keep the full-page spinner
 * to auth restore only; everything else is chrome + a For You state.
 */

export const DISCOVER_BOOT_TIMEOUT_MS = 8_000;

export type DiscoverBootPhase = "spinner" | "redirect-auth" | "page";

export function resolveDiscoverBoot(input: {
  authLoading: boolean;
  hasUser: boolean;
  /** Once the page has rendered, later loading flaps must not remount the spinner. */
  hasBootstrapped: boolean;
  timedOut: boolean;
}): DiscoverBootPhase {
  if (input.hasBootstrapped) return input.hasUser ? "page" : "redirect-auth";
  if (!input.authLoading && !input.hasUser) return "redirect-auth";
  if (input.timedOut) return input.hasUser ? "page" : "redirect-auth";
  if (input.authLoading) return "spinner";
  return "page";
}

export type DiscoverForYouPhase =
  | "skeleton"
  | "boot-error"
  | "upgrade"
  | "no-profile"
  | "feed-loading"
  | "feed-error"
  | "feed";

export function resolveDiscoverForYou(input: {
  subscriptionLoading: boolean;
  hasSubscription: boolean;
  subscriptionError: boolean;
  isPremium: boolean;
  profilesLoading: boolean;
  profileCount: number;
  feedLoading: boolean;
  feedError: boolean;
  timedOut: boolean;
}): DiscoverForYouPhase {
  if (!input.hasSubscription) {
    if (input.timedOut || input.subscriptionError) return "boot-error";
    if (input.subscriptionLoading) return "skeleton";
    return "upgrade";
  }
  if (!input.isPremium) return "upgrade";
  if (input.profilesLoading && input.profileCount === 0) {
    return input.timedOut ? "boot-error" : "skeleton";
  }
  if (input.profileCount === 0) return "no-profile";
  if (input.feedLoading) return "feed-loading";
  if (input.feedError) return "feed-error";
  return "feed";
}
