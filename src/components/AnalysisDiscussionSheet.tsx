import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Lock, MessagesSquare, Pencil, RefreshCw, Send, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { useToast } from "@/hooks/use-toast";
import { useAnalysisDiscussion } from "@/hooks/useAnalysisDiscussion";
import { cn } from "@/lib/utils";
import { triggerHapticFeedback } from "@/lib/capacitor";

interface AnalysisDiscussionSheetProps {
  episodeId: string;
  episodeTitle: string;
  /** Whether the current user owns the episode (may moderate any message). */
  isOwner: boolean;
  /** Owner on a non-Boardroom plan: show the upgrade path instead of the thread. */
  ownerNeedsUpgrade?: boolean;
  /** Lets the owner jump to the invite dialog from the empty state. */
  onInviteClick?: () => void;
  /** Icon-only trigger below the sm breakpoint, for crowded button rows. */
  compactTrigger?: boolean;
}

// The thread is async by design; a slow poll while the sheet is open keeps a
// live back-and-forth feeling fresh without realtime infrastructure.
const POLL_INTERVAL_MS = 15_000;

export const AnalysisDiscussionSheet = ({
  episodeId,
  episodeTitle,
  isOwner,
  ownerNeedsUpgrade = false,
  onInviteClick,
  compactTrigger = false,
}: AnalysisDiscussionSheetProps) => {
  const { toast } = useToast();
  const api = useAnalysisDiscussion(episodeId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const messageCount = api.error ? 0 : api.messages.length;
  const showUnreadDot = !api.error && api.unreadCount > 0;

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  useEffect(() => {
    if (!open || ownerNeedsUpgrade) return;
    void api.reload().then(() => api.markRead());
    const interval = window.setInterval(() => {
      void api.reload({ silent: true }).then(() => api.markRead());
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ownerNeedsUpgrade, episodeId]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [open, api.messages.length]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setDraft("");
    setSending(true);
    void triggerHapticFeedback("light");
    try {
      await api.send(trimmed);
      void api.markRead();
    } catch (err: unknown) {
      setDraft(trimmed);
      toast({
        title: "Could not send message",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editBody.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await api.edit(editingId, editBody);
      setEditingId(null);
      setEditBody("");
    } catch (err: unknown) {
      toast({
        title: "Could not update message",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await api.remove(messageId);
    } catch (err: unknown) {
      toast({
        title: "Could not delete message",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const notSharedYet = isOwner && api.collaborators.length <= 1;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="relative sm:size-default flex-1 sm:flex-initial"
          aria-label={showUnreadDot ? "Discussion (unread messages)" : "Discussion"}
          onClick={() => void triggerHapticFeedback("light")}
        >
          <MessagesSquare className={cn("w-4 h-4", compactTrigger ? "sm:mr-2" : "mr-2")} />
          <span className={cn(compactTrigger && "hidden sm:inline")}>
            Discussion{messageCount > 0 ? ` (${messageCount})` : ""}
          </span>
          {showUnreadDot && (
            <span
              aria-hidden
              className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_0_2px_hsl(var(--secondary))]"
            />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-dvh" side="right">
        <SheetHeader className="glass-nav px-4 sm:px-6 py-4 border-b text-left pr-14">
          <SheetTitle className="flex items-center gap-2.5 tracking-tight">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessagesSquare className="h-4 w-4" />
            </span>
            Discussion
          </SheetTitle>
          <SheetDescription className="line-clamp-2">
            “{episodeTitle}” — visible to everyone with access to this analysis.
          </SheetDescription>
        </SheetHeader>

        {ownerNeedsUpgrade ? (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 bg-muted/20">
            <Card className="p-4 border-primary/15 bg-primary/5">
              <div className="flex gap-3">
                <Lock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Discussion threads are a Boardroom feature</p>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to The Boardroom to share analyses with your team and discuss them
                    together — right here instead of over email or text.
                  </p>
                </div>
              </div>
            </Card>
            <UpgradePrompt
              message="Unlock sharing and team discussion threads with The Boardroom plan."
              feature="sharing"
            />
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 bg-muted/20">
              {api.loading && api.messages.length === 0 ? (
                <Card className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading discussion...
                </Card>
              ) : api.messages.length === 0 ? (
                <div className="space-y-4">
                  <Card className="p-4 border-primary/15 bg-primary/5">
                    <div className="flex gap-3">
                      <MessagesSquare className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        {notSharedYet ? (
                          <>
                            <p className="font-medium text-sm">You haven't shared this analysis yet</p>
                            <p className="text-sm text-muted-foreground">
                              Invite a teammate, then use this thread to decide together which
                              takeaways to act on.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-sm">Start the discussion</p>
                            <p className="text-sm text-muted-foreground">
                              Share your take on this analysis with everyone who has access —
                              replies land right here instead of your inbox.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                  {notSharedYet && onInviteClick && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOpen(false);
                        onInviteClick();
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite a teammate
                    </Button>
                  )}
                </div>
              ) : (
                api.messages.map((message, index) => {
                  const own = message.author_user_id === api.currentUserId;
                  const previous = index > 0 ? api.messages[index - 1] : null;
                  const showMeta = !previous || previous.author_user_id !== message.author_user_id;
                  const edited = message.updated_at !== message.created_at;
                  const editing = editingId === message.id;
                  return (
                    <div
                      key={message.id}
                      className={cn("flex flex-col animate-slide-up", own ? "items-end" : "items-start")}
                    >
                      {showMeta && (
                        <p className="mb-1 px-1 text-caption-1 text-muted-foreground">
                          {api.labelFor(message.author_user_id)}
                          <span className="text-muted-foreground/60">
                            {" · "}
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </span>
                        </p>
                      )}
                      {editing ? (
                        <div className="w-full max-w-[85%] space-y-1.5">
                          <Textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            rows={2}
                            className="min-h-0 text-sm"
                          />
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                setEditingId(null);
                                setEditBody("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-xs"
                              disabled={savingEdit || !editBody.trim()}
                              onClick={() => void handleSaveEdit()}
                            >
                              {savingEdit && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                              own
                                ? "rounded-br-md text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.15)]"
                                : "rounded-bl-md bg-card border border-border/70 shadow-sm",
                            )}
                            style={own ? { background: "var(--gradient-primary)" } : undefined}
                            title={new Date(message.created_at).toLocaleString()}
                          >
                            {message.body}
                            {edited && (
                              <span
                                className={cn(
                                  "ml-1.5 text-[10px]",
                                  own ? "text-primary-foreground/70" : "text-muted-foreground",
                                )}
                              >
                                (edited)
                              </span>
                            )}
                          </div>
                          {(own || isOwner) && (
                            <div className="mt-0.5 flex items-center gap-0.5">
                              {own && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  aria-label="Edit message"
                                  onClick={() => {
                                    setEditingId(message.id);
                                    setEditBody(message.body);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                aria-label="Delete message"
                                onClick={() => void handleDelete(message.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {api.error && (
              <div className="px-4 sm:px-6 py-3 border-t bg-destructive/5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-destructive">{api.error}</p>
                  <Button variant="outline" size="sm" onClick={() => void api.reload()} disabled={api.loading}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Retry
                  </Button>
                </div>
              </div>
            )}

            <form
              className="px-4 sm:px-6 py-4 border-t bg-background pb-[calc(1rem+var(--safe-area-bottom))]"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend();
              }}
            >
              <div className="flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Share your take with everyone who has access..."
                  className="min-h-[48px] max-h-32 resize-none"
                  disabled={sending}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                />
                <Button type="submit" size="icon" className="rounded-full" disabled={!draft.trim() || sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Messages are visible to everyone this analysis is shared with.
              </p>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
