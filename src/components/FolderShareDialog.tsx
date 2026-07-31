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
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, Link2, Loader2, Trash2, Users } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { hasSharing } from "@/types/subscription";
import { UpgradePrompt } from "@/components/subscription";
import {
  createFolderInvite,
  listFolderCollaborators,
  revokeFolderInvite,
  type FolderInvite,
} from "@/services/folderSharing";

interface FolderShareDialogProps {
  folderId: string | null;
  folderName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Invited",
  accepted: "Has access",
  expired: "Expired",
  revoked: "Revoked",
};

export const FolderShareDialog = ({
  folderId,
  folderName,
  open,
  onOpenChange,
}: FolderShareDialogProps) => {
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const canShare = subscription ? hasSharing(subscription.tier) : false;
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<FolderInvite[]>([]);
  const [latestLink, setLatestLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !folderId || !canShare) return;
    setLatestLink(null);
    setCopied(false);
    setLoading(true);
    listFolderCollaborators(folderId)
      .then(setCollaborators)
      .catch((err) => {
        console.error("Failed to load collaborators", err);
        toast({
          title: "Couldn't load collaborators",
          description: err?.message || "Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [open, folderId, toast, canShare]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderId || inviting) return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({
        title: "Enter a valid email",
        description: "We need a real email address to address the invitation.",
        variant: "destructive",
      });
      return;
    }

    setInviting(true);
    try {
      const { invite, link } = await createFolderInvite({ folderId, email: trimmed });
      setCollaborators((prev) => [...prev.filter((c) => c.id !== invite.id), invite]);
      setLatestLink(link);
      setCopied(false);
      setEmail("");
      // Best-effort: drop the link on the clipboard so it's ready to paste.
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      } catch {
        /* clipboard may be blocked; the link is shown for manual copy */
      }
      toast({
        title: "Link created and copied",
        description: "Send it to your collaborator to give them access.",
      });
    } catch (err) {
      toast({
        title: "Couldn't create link",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (invite: FolderInvite) => {
    try {
      await revokeFolderInvite(invite);
      setCollaborators((prev) => prev.filter((c) => c.id !== invite.id));
      toast({ title: "Access revoked" });
    } catch (err) {
      toast({
        title: "Couldn't revoke access",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyLink = async () => {
    if (!latestLink) return;
    try {
      await navigator.clipboard.writeText(latestLink);
      setCopied(true);
      toast({ title: "Link copied" });
    } catch {
      toast({
        title: "Copy failed",
        description: "Select the link and copy it manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Share “{folderName}”
          </DialogTitle>
          <DialogDescription>
            Create a private link for a teammate or advisor. They can view this folder's
            insights and join the comment threads — and see nothing else in your workspace.
            You send the link however you like; we don't email it for you.
          </DialogDescription>
        </DialogHeader>

        {!canShare ? (
          <div className="pt-1">
            <UpgradePrompt
              feature="sharing"
              message="Inviting collaborators is a Boardroom feature. Upgrade to share read-only insight access with teammates and advisors."
            />
          </div>
        ) : (
          <>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Who is this link for?</Label>
            <div className="flex gap-2">
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
              <Button type="submit" disabled={inviting || !folderId}>
                {inviting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Create link</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Their email locks the link to that person — you still send it yourself.
            </p>
          </div>
        </form>

        {latestLink && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Send this link to your collaborator
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-background px-2 py-1.5 text-xs">
                {latestLink}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              The link is shown once and expires in 14 days. Re-invite to generate a new one.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">People with access</p>
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : collaborators.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              No collaborators yet. Invite someone above.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {collaborators.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{c.invited_email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{c.role}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={c.status === "accepted" ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Revoke access for ${c.invited_email}`}
                      onClick={() => handleRevoke(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
