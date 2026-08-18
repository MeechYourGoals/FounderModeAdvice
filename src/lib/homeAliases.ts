/** Typed URLs that must not 404 inside the WebView. */
export const AUTH_ALIASES = ["/login", "/signin"] as const;
export const HOME_HASH_ALIASES: Record<string, string> = {
  "/product": "/#product",
  "/pricing": "/#pricing",
  "/use-cases": "/#use-cases",
  "/demo": "/#demo",
  "/analyze": "/",
};
