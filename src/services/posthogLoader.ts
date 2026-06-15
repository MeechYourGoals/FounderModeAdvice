/* eslint-disable */
// PostHog web SDK loader — official snippet (https://posthog.com/docs/libraries/js).
//
// Loaded on demand from PostHog's CDN so we do NOT add a bundled npm dependency
// and analytics ships over-the-air with the web app. The Despia native runtime
// uses the posthog:// bridge instead and never loads this (see analytics.ts).
//
// This is vendored third-party code, hence @ts-nocheck + eslint-disable. The
// typed, app-facing API lives in src/services/analytics.ts.

let bootstrapped = false;

/**
 * Inject the PostHog snippet (idempotent) and initialize the web SDK.
 * Returns window.posthog — a queue stub that transparently replays calls once
 * array.js finishes loading, so callers can use it immediately.
 */
export function initPostHogWeb(apiKey: string, apiHost: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return undefined;
  if (bootstrapped) return window.posthog;
  bootstrapped = true;

  void function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document as any,(window.posthog||[]) as any);

  try {
    window.posthog.init(apiKey, {
      api_host: apiHost,
      person_profiles: "identified_only",
      // Screen/page views and identity are sent explicitly from analytics.ts.
      capture_pageview: false,
      autocapture: false,
      disable_session_recording: true,
    });
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[analytics] PostHog web init failed", e);
  }

  return window.posthog;
}
