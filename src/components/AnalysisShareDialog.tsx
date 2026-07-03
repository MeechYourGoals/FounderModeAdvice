import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { hasSharing } from "@/types/subscription";
import {
  createAnalysisInvite,
  listAnalysisInvites,
  revokeAnalysisInvite,
  type AnalysisInvite,
} from "@/services/analysisSharing";
import { UpgradePrompt } from "@/components/subscription";

interface AnalysisShareDialogProps {
  episodeId: string | null;
  episodeTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Invited",
  accepted: "Has access",
  expired: "Expired",
  revoked: "Revoked",
};

export const AnalysisShareDialog = ({ episodeId, episodeTitle, open, onOpenChange }: AnalysisShareDialogProps) => {
  const { subscription } = useSubscription();
  const { toast } = useToast();
  const canShare = subscription ? hasSharing(subscription.tier) : false;
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<AnalysisInvite[]>([]);
  const [latestLink, setLatestLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !episodeId || !canShare) return;
    setLoading(true);
    setLatestLink(null);
    setCopied(false);
    listAnalysisInvites(episodeId)
      .then(setInvites)
      .catch((error) => {
        console.error("Failed to load analysis invites", error);
        toast({
          title: "Couldn't load invites",
          description: "Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [open, episodeId, canShare, toast]);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!episodeId || inviting) return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }

    setInviting(true);
    try {
      const { invite, link } = await createAnalysisInvite({ episodeId, email: trimmed });
      setInvites((prev) => [...prev.filter((item) => item.id !== invite.id), invite]);
      setLatestLink(link);
      setCopied(false);
      setEmail("");
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      } catch {
        // Clipboard can be blocked in some browsers.
      }
      toast({
        title: "Invite link ready",
        description: "Share the link with your teammate or advisor.",
      });
    } catch (error) {
      toast({
        title: "Couldn't create invite",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (invite: AnalysisInvite) => {
    try {
      await revokeAnalysisInvite(invite);
      setInvites((prev) => prev.filter((item) => item.id !== invite.id));
      toast({ title: "Access revoked" });
    } catch (error) {
      toast({
        title: "Couldn't revoke access",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Share analysis
          </DialogTitle>
          <DialogDescription>
            Invite teammates or advisors to view “{episodeTitle}”, comment on individual insights, and tag each other in the discussion.
          </DialogDescription>
        </DialogHeader>

        {!canShare ? (
          <UpgradePrompt
            feature="sharing"
            message="Invited analysis sharing is a Boardroom feature."
          />
        ) : (
          <div className="space-y-3">
            <form onSubmit={handleInvite} className="space-y-1.5">
              <Label htmlFor="analysis-invite-email">Invite by email</Label>
              <div className="flex gap-2">
                <Input
                  id="analysis-invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="advisor@company.com"
                />
                <Button type="submit" disabled={inviting || !episodeId}>
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                </Button>
              </div>
            </form>

            {latestLink && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Send this link to your collaborator</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-background px-2 py-1.5 text-xs">
                    {latestLink}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(latestLink);
                        setCopied(true);
                      } catch {
                        // no-op
                      }
                    }}
                  >
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">People with access</p>
              {loading ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : invites.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">No invites yet.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{invite.invited_email}</p>
                        <p className="text-xs text-muted-foreground capitalize">{invite.role}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={invite.status === "accepted" ? "default" : "outline"} className="text-[10px]">
                          {STATUS_LABELS[invite.status] ?? invite.status}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRevoke(invite)}
                          aria-label={`Revoke ${invite.invited_email}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
