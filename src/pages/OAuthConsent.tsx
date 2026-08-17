import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/BrandLogo";
import { Loader2 } from "lucide-react";

type AuthorizationDetails = {
  client?: { name?: string | null; client_uri?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthNamespace = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

/** `supabase.auth.oauth` is beta and not in the generated types yet. */
const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

/**
 * Consent screen for the app's OAuth 2.1 authorization server. MCP clients
 * (ChatGPT, Claude, Cursor) are redirected here to let the user approve
 * connecting an agent to their Founder Mode Advisor account.
 */
const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error: detailsError } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error: decideError } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (decideError) {
      setBusy(false);
      setError(decideError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? "an app";

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-6 p-4"
      style={{ background: "var(--gradient-hero)" }}
    >
      <BrandLogo className="h-12 w-auto" />
      <Card className="glass-strong w-full max-w-md rounded-3xl shadow-glass">
        {error ? (
          <>
            <CardHeader>
              <CardTitle className="text-xl">Could not load this request</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => window.location.assign("/")}>
                Back to app
              </Button>
            </CardContent>
          </>
        ) : !details ? (
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading authorization request…</p>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-xl">Connect {clientName}</CardTitle>
              <CardDescription>
                {clientName} is asking to use Founder Mode Advisor as you. It will be able to read
                your analyzed sources, extracted lessons, and startup profiles. You can disconnect it
                at any time from the client.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Button className="w-full min-h-11" disabled={busy} onClick={() => decide(true)}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve
              </Button>
              <Button
                variant="outline"
                className="w-full min-h-11"
                disabled={busy}
                onClick={() => decide(false)}
              >
                Deny
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
};

export default OAuthConsent;
