/** Production custom domain apex — OAuth PKCE must start and finish on this origin. */
export const CANONICAL_WEB_ORIGIN = "https://foundermodeadvice.com";

/** Apple Services ID for web OAuth only. Native iOS uses the bundle id via signInWithIdToken. */
export const APPLE_WEB_SERVICES_CLIENT_ID = "com.foundermodeadvice.app.auth";

const PRODUCTION_HOSTS = new Set(["foundermodeadvice.com", "www.foundermodeadvice.com"]);

/**
 * Origin to use for OAuth redirects and Supabase email links on the production
 * domain. Always the apex so PKCE verifier storage matches the callback host.
 */
export function canonicalWebOriginForHost(
  hostname: string,
  fallbackOrigin: string,
): string {
  if (PRODUCTION_HOSTS.has(hostname)) return CANONICAL_WEB_ORIGIN;
  return fallbackOrigin;
}

/** True when the browser should navigate from www to apex before auth/session work. */
export function shouldRedirectWwwToApex(hostname: string): boolean {
  return hostname === "www.foundermodeadvice.com";
}

export function apexRedirectTarget(
  pathname: string,
  search: string,
  hash: string,
): string {
  return `${CANONICAL_WEB_ORIGIN}${pathname}${search}${hash}`;
}
