import { Capacitor } from "@capacitor/core";
import despia from "despia-native";
import { isDespia } from "@/services/despiaService";
import { isExpoShell } from "@/services/expoShellService";
import { isStandalonePWA } from "@/lib/appMode";
import { initPostHogWeb } from "@/services/posthogLoader";

/**
 * Runtime-aware product analytics (PostHog).
 *
 * - Despia native runtime → native PostHog via the `posthog://` bridge
 *   (PostHog is compiled into the Despia app and enabled in the Despia dashboard).
 * - Capacitor / installed PWA → PostHog web SDK, loaded on demand from the CDN.
 * - Plain browser, when disabled, or when unconfigured → safe no-op.
 *
 * Every call is browser-safe and never throws. See DESPIA_READINESS.md for the
 * PostHog setup checklist.
 */

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com"
).replace(/\/+$/, "");
const ANALYTICS_ENABLED = (import.meta.env.VITE_DESPIA_POSTHOG_ENABLED ?? "true") !== "false";

type Props = Record<string, unknown>;

let mode: "despia" | "web" | "off" = "off";
let initialized = false;

/**
 * Analytics is gated to installed-app experiences (native wrappers + installed
 * PWA), matching the push gating. Widen this if you want web analytics too.
 */
function inInstalledApp(): boolean {
  return isDespia() || isExpoShell() || Capacitor.isNativePlatform() || isStandalonePWA();
}

function bridge(command: string): void {
  try {
    despia(command);
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[analytics] Despia bridge failed:", command, e);
  }
}

function web() {
  return typeof window !== "undefined" ? window.posthog : undefined;
}

/**
 * Initialize analytics for the current runtime. Idempotent and non-blocking.
 */
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  if (!ANALYTICS_ENABLED || !inInstalledApp()) {
    mode = "off";
    return;
  }

  if (isDespia()) {
    // Despia compiles PostHog natively; the web app only sends bridge commands.
    mode = "despia";
    return;
  }

  if (POSTHOG_KEY) {
    initPostHogWeb(POSTHOG_KEY, POSTHOG_HOST);
    mode = "web";
  } else {
    mode = "off";
    if (import.meta.env.DEV) {
      console.log("[analytics] VITE_POSTHOG_KEY not set — web analytics disabled");
    }
  }
}

export function captureEvent(event: string, properties?: Props): void {
  if (mode === "despia") {
    const q = properties ? `&properties=${encodeURIComponent(JSON.stringify(properties))}` : "";
    bridge(`posthog://capture?event=${encodeURIComponent(event)}${q}`);
  } else if (mode === "web") {
    web()?.capture(event, properties);
  }
}

export function captureScreen(screen: string, properties?: Props): void {
  if (mode === "despia") {
    bridge(`posthog://screen?screen=${encodeURIComponent(screen)}`);
  } else if (mode === "web") {
    // origin + pathname only — never window.location.href, which would leak
    // query/hash secrets (e.g. the Supabase PKCE `?code=` on /auth/callback) to PostHog.
    const url =
      typeof window !== "undefined"
        ? window.location.origin + window.location.pathname
        : undefined;
    web()?.capture("$pageview", {
      $current_url: url,
      screen,
      ...properties,
    });
  }
}

export function identifyUser(distinctId: string, traits?: Props): void {
  if (!distinctId) return;
  if (mode === "despia") {
    const q = traits ? `&properties=${encodeURIComponent(JSON.stringify(traits))}` : "";
    bridge(`posthog://identify?distinct_id=${encodeURIComponent(distinctId)}${q}`);
  } else if (mode === "web") {
    web()?.identify(distinctId, traits);
  }
}

export function resetAnalyticsUser(): void {
  if (mode === "despia") bridge("posthog://reset");
  else if (mode === "web") web()?.reset();
}

export function optInAnalytics(): void {
  if (mode === "despia") bridge("posthog://opt_in");
  else if (mode === "web") web()?.opt_in_capturing();
}

export function optOutAnalytics(): void {
  if (mode === "despia") bridge("posthog://opt_out");
  else if (mode === "web") web()?.opt_out_capturing();
}

/**
 * Read a PostHog feature flag. Web SDK only — Despia does not reliably expose
 * flags to JS, so it returns undefined there.
 */
export function getFeatureFlag(key: string): boolean | string | undefined {
  if (mode === "web") return web()?.getFeatureFlag?.(key);
  return undefined;
}

/** Whether analytics is active for the current runtime (handy for guards/tests). */
export function isAnalyticsActive(): boolean {
  return mode !== "off";
}
