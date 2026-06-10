import posthog from "posthog-js";
import { supabase } from "@/integrations/supabase/client";

// PostHog analytics — initialized once at app startup (see main.tsx).
// The project API key is a public, client-safe identifier (like the Supabase
// publishable key); skipping init when it's absent keeps local/preview builds quiet.
export function initAnalytics() {
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
  if (!key) {
    console.log("PostHog: VITE_PUBLIC_POSTHOG_KEY not set — skipping analytics init");
    return;
  }

  posthog.init(key, {
    api_host:
      (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined) ??
      "https://us.i.posthog.com",
    // "defaults" pins SDK behavior to a dated preset; this one captures SPA
    // pageviews on history changes, which react-router navigation relies on.
    defaults: "2025-05-24",
    capture_exceptions: true,
    debug: import.meta.env.DEV,
  });

  // Tie the analytics identity to the Supabase auth session so events from
  // web, PWA, and Capacitor wrappers roll up to the same person.
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      // onAuthStateChange also fires on token refreshes; only re-identify
      // when the distinct id actually changes.
      if (posthog.get_distinct_id() !== session.user.id) {
        posthog.identify(session.user.id, { email: session.user.email });
      }
    } else if (event === "SIGNED_OUT") {
      posthog.reset();
    }
  });
}

export { posthog };
