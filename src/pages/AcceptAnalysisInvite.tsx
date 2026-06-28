import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/BrandLogo";
import { Loader2, AlertCircle, Lightbulb, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { acceptAnalysisInvite, PENDING_ANALYSIS_INVITE_KEY } from "@/services/analysisSharing";

type Status = "loading" | "signin" | "accepting" | "success" | "error";

const AcceptAnalysisInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (loading || !token) return;

    if (!user) {
      localStorage.setItem(PENDING_ANALYSIS_INVITE_KEY, token);
      setStatus("signin");
      return;
    }

    if (attempted.current) return;
    attempted.current = true;
    setStatus("accepting");

    acceptAnalysisInvite(token)
      .then((eid) => {
        localStorage.removeItem(PENDING_ANALYSIS_INVITE_KEY);
        setEpisodeId(eid);
        setStatus("success");
        setTimeout(() => navigate(`/shared-analysis/${eid}`, { replace: true }), 1200);
      })
      .catch((err) => {
        localStorage.removeItem(PENDING_ANALYSIS_INVITE_KEY);
        setMessage(err?.message || "This invitation is no longer valid.");
        setStatus("error");
      });
  }, [user, loading, token, navigate]);

  return (
    <div className="grain relative min-h-screen flex flex-col items-center justify-center gap-6 p-4" style={{ background: "var(--gradient-hero)" }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-mesh)" }} />
      <BrandLogo className="relative h-12 w-auto" />
      <Card className="glass-strong relative w-full max-w-md rounded-3xl shadow-glass">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {status === "error" ? <AlertCircle className="h-6 w-6" /> : status === "signin" ? <Users className="h-6 w-6" /> : <Lightbulb className="h-6 w-6" />}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {status === "success" ? "You're in!" : status === "error" ? "Invitation problem" : "Analysis invitation"}
          </CardTitle>
          <CardDescription>
            {status === "signin"
              ? "You've been invited to view an analysis. Sign in or create an account to continue."
              : status === "success"
                ? "Access granted. Taking you to the analysis…"
                : status === "error"
                  ? message
                  : "Confirming your invitation…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(status === "loading" || status === "accepting") && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {status === "signin" && (
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Sign in to continue
            </Button>
          )}
          {status === "success" && episodeId && (
            <Button className="w-full" onClick={() => navigate(`/shared-analysis/${episodeId}`, { replace: true })}>
              Open shared analysis
            </Button>
          )}
          {status === "error" && (
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Go to home
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptAnalysisInvite;
