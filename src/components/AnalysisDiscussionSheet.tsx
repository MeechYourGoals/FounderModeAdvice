import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { Copy, Loader2, Lock, MessagesSquare, Pencil, RefreshCw, Send, Trash2, UserPlus } from "lucide-react";
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAnalysisDiscussion, type LocalDiscussionMessage } from "@/hooks/useAnalysisDiscussion";
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
// Consecutive messages from one author within this window render as a group.
const GROUP_WINDOW_MS = 3 * 60_000;
// "Near bottom" tolerance for auto-scroll vs. the "New messages" chip.
const NEAR_BOTTOM_PX = 120;

const STARTER_PROMPTS = [
  "What stood out to you in this one?",
  "Which of these tips should we implement?",
  "Here's what I think we should do next:",
];

const dayLabel = (date: Date) => {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
};

/** iMessage-style gradient initial for teammates (mirrors the lens-picker avatars). */
const AuthorAvatar = ({ label }: { label: string }) => (
  <span
    aria-hidden
    className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold text-primary-foreground"
    style={{ background: "var(--gradient-primary)" }}
  >
    {label.charAt(0).toUpperCase()}
  </span>
);

export const AnalysisDiscussionSheet = ({
  episodeId,
  episodeTitle,
  isOwner,
  ownerNeedsUpgrade = false,
  onInviteClick,
  compactTrigger = false,
}: AnalysisDiscussionSheetProps) => {
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const api = useAnalysisDiscussion(episodeId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [newBelow, setNewBelow] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const nearBottomRef = useRef(true);
  const didInitialScrollRef = useRef(false);
  const lastRemoteStampRef = useRef(0);

  const messageCount = api.error ? 0 : api.messages.filter((m) => !m.localStatus).length;
  const showUnreadDot = !api.error && api.unreadCount > 0;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
    });
    setNewBelow(false);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (nearBottomRef.current) setNewBelow(false);
  }, []);

  // Open: refresh, mark read, and keep polling silently while visible.
  useEffect(() => {
    if (!open || ownerNeedsUpgrade) return;
    didInitialScrollRef.current = false;
    void api.reload().then(() => api.markRead());
    const interval = window.setInterval(() => {
      void api.reload({ silent: true }).then(() => api.markRead());
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ownerNeedsUpgrade, episodeId]);

  // Land at the bottom instantly on open (no long scroll animation), like a
  // native conversation view.
  useEffect(() => {
    if (!open || api.loading || didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    scrollToBottom("auto");
  }, [open, api.loading, scrollToBottom]);

  // New messages: follow the conversation when near the bottom; otherwise
  // offer a "New messages" chip. Tick a light haptic for incoming replies.
  useEffect(() => {
    if (!open || !didInitialScrollRef.current) return;
    const last = api.messages[api.messages.length - 1];
    if (!last) return;
    const remote = api.messages.filter((m) => !m.localStatus && m.author_user_id !== api.currentUserId);
    const newestRemote = remote.length ? new Date(remote[remote.length - 1].created_at).getTime() : 0;
    const hasNewRemote = newestRemote > lastRemoteStampRef.current;
    if (hasNewRemote && lastRemoteStampRef.current > 0) void triggerHapticFeedback("light");
    lastRemoteStampRef.current = Math.max(lastRemoteStampRef.current, newestRemote);

    const lastIsOwn = last.author_user_id === api.currentUserId;
    if (lastIsOwn || nearBottomRef.current) {
      scrollToBottom("smooth");
    } else if (hasNewRemote) {
      setNewBelow(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.messages.length, open]);

  useEffect(() => {
    if (!open) {
      lastRemoteStampRef.current = 0;
      setNewBelow(false);
    }
  }, [open]);

  const autoGrow = useCallback(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft("");
    window.requestAnimationFrame(autoGrow);
    void triggerHapticFeedback("light");
    // Optimistic: the bubble appears instantly; a failure keeps it in the
    // thread with a tap-to-retry affordance instead of a toast.
    await api.send(trimmed);
  }, [draft, api, autoGrow]);

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
    void triggerHapticFeedback("medium");
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

  const handleCopy = (body: string) => {
    void triggerHapticFeedback("light");
    void navigator.clipboard?.writeText(body).catch(() => undefined);
  };

  const applyStarter = (prompt: string) => {
    void triggerHapticFeedback("light");
    setDraft((prev) => (prev.trim() ? prev : prompt + " "));
    window.requestAnimationFrame(() => {
      autoGrow();
      composerRef.current?.focus();
    });
  };

  const notSharedYet = isOwner && api.collaborators.length <= 1;

  const rows = useMemo(() => {
    return api.messages.map((message, index) => {
      const previous = index > 0 ? api.messages[index - 1] : null;
      const next = index < api.messages.length - 1 ? api.messages[index + 1] : null;
      const date = new Date(message.created_at);
      const newDay = !previous || !isSameDay(new Date(previous.created_at), date);
      const startsGroup =
        newDay ||
        !previous ||
        previous.author_user_id !== message.author_user_id ||
        date.getTime() - new Date(previous.created_at).getTime() > GROUP_WINDOW_MS;
      const endsGroup =
        !next ||
        next.author_user_id !== message.author_user_id ||
        !isSameDay(date, new Date(next.created_at)) ||
        new Date(next.created_at).getTime() - date.getTime() > GROUP_WINDOW_MS;
      return { message, date, newDay, startsGroup, endsGroup };
    });
  }, [api.messages]);

  const bubble = (row: (typeof rows)[number]) => {
    const { message, date, startsGroup, endsGroup } = row;
    const own = message.author_user_id === api.currentUserId;
    const pending = message.localStatus === "sending";
    const failed = message.localStatus === "failed";
    const edited = !message.localStatus && message.updated_at !== message.created_at;
    const canEdit = own && !message.localStatus;
    const canDelete = (own || isOwner) && !message.localStatus;

    if (editingId === message.id) {
      return (
        <div className={cn("w-full max-w-[85%] space-y-1.5", own && "ml-auto")}>
          <Textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={2}
            autoFocus
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
      );
    }

    const bubbleEl = (
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap select-none [-webkit-touch-callout:none] transition-opacity",
          own
            ? "text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.15)]"
            : "bg-card border border-border/70 shadow-sm",
          own && endsGroup && "rounded-br-md",
          !own && endsGroup && "rounded-bl-md",
          pending && "opacity-60",
          failed && "opacity-80",
        )}
        style={own ? { background: "var(--gradient-primary)" } : undefined}
        title={date.toLocaleString()}
      >
        {message.body}
        {edited && (
          <span className={cn("ml-1.5 text-[10px]", own ? "text-primary-foreground/70" : "text-muted-foreground")}>
            (edited)
          </span>
        )}
      </div>
    );

    return (
      <div className={cn("flex w-full flex-col message-in", own ? "items-end" : "items-start")}>
        {startsGroup && (
          <p className={cn("mb-1 px-1 text-caption-1 text-muted-foreground", !own && "pl-9")}>
            {!own && <>{api.labelFor(message.author_user_id)} · </>}
            {format(date, "p")}
          </p>
        )}
        <div className={cn("flex w-full items-end gap-2", own ? "justify-end" : "justify-start")}>
          {!own && (
            <span className="w-6 shrink-0">
              {endsGroup && <AuthorAvatar label={api.labelFor(message.author_user_id)} />}
            </span>
          )}
          <div className={cn("group flex min-w-0 items-center gap-1.5", own && "flex-row-reverse")}>
            {message.localStatus ? (
              bubbleEl
            ) : (
              <ContextMenu>
                <ContextMenuTrigger asChild>{bubbleEl}</ContextMenuTrigger>
                <ContextMenuContent className="w-44">
                  <ContextMenuItem onSelect={() => handleCopy(message.body)}>
                    <Copy className="mr-2 h-3.5 w-3.5" /> Copy
                  </ContextMenuItem>
                  {canEdit && (
                    <ContextMenuItem
                      onSelect={() => {
                        setEditingId(message.id);
                        setEditBody(message.body);
                      }}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                    </ContextMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => void handleDelete(message.id)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            )}
            {/* Desktop hover affordances; touch users long-press instead. */}
            {(canEdit || canDelete) && (
              <span className="hidden shrink-0 items-center gap-0.5 opacity-0 transition-opacity lg:flex lg:group-hover:opacity-100">
                {canEdit && (
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
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    aria-label="Delete message"
                    onClick={() => void handleDelete(message.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </span>
            )}
          </div>
        </div>
        {failed && (
          <div className="mt-1 flex items-center gap-2 px-1 text-caption-1">
            <button
              type="button"
              className="font-medium text-destructive"
              onClick={() => {
                void triggerHapticFeedback("light");
                void api.retrySend(message.id);
              }}
            >
              Not delivered · Tap to retry
            </button>
            <button
              type="button"
              className="text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => api.discardFailed(message.id)}
            >
              Discard
            </button>
          </div>
        )}
      </div>
    );
  };

  const thread = (
    <>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 bg-muted/20"
      >
        {api.loading && api.messages.length === 0 ? (
          <Card className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading discussion...
          </Card>
        ) : api.messages.length === 0 ? (
          <div className="space-y-4">
            <Card className="p-4 border-primary/15 bg-primary/5 animate-scale-in">
              <div className="flex gap-3">
                <MessagesSquare className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {notSharedYet ? (
                    <>
                      <p className="font-medium text-sm">You haven't shared this analysis yet</p>
                      <p className="text-sm text-muted-foreground">
                        Invite a teammate, then use this thread to decide together which takeaways
                        to act on.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-sm">Start the discussion</p>
                      <p className="text-sm text-muted-foreground">
                        Share your take on this analysis with everyone who has access — replies
                        land right here instead of your inbox.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Card>
            {notSharedYet && onInviteClick ? (
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
            ) : (
              !notSharedYet && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
                    Kick things off
                  </p>
                  {STARTER_PROMPTS.map((prompt, i) => (
                    <button
                      key={prompt}
                      type="button"
                      className="stagger-item group flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 text-left text-sm transition-all hover:border-primary/30 hover:bg-primary/5 active:scale-[0.99]"
                      style={{ "--stagger-i": i } as CSSProperties}
                      onClick={() => applyStarter(prompt)}
                    >
                      <span>{prompt}</span>
                      <Pencil
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.message.id} className={cn(row.startsGroup ? "mt-4 first:mt-0" : "mt-0.5")}>
              {row.newDay && (
                <p className="mb-3 mt-1 text-center text-caption-2 font-medium text-muted-foreground/70">
                  {dayLabel(row.date)}
                </p>
              )}
              {bubble(row)}
            </div>
          ))
        )}
      </div>

      {newBelow && (
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="absolute -top-12 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/60 bg-card/95 px-3.5 py-1.5 text-xs font-medium text-primary shadow-glass backdrop-blur animate-scale-in"
          >
            ↓ New messages
          </button>
        </div>
      )}

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
        className="px-4 sm:px-6 py-3 border-t bg-background pb-[calc(0.75rem+var(--safe-area-bottom))]"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            ref={composerRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              autoGrow();
            }}
            placeholder="Share your take..."
            rows={1}
            enterKeyHint="send"
            className="min-h-[44px] max-h-32 resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={!draft.trim()}
            className={cn(
              "h-11 w-11 shrink-0 rounded-full transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90",
              draft.trim() ? "scale-100 opacity-100" : "scale-90 opacity-50",
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Visible to everyone this analysis is shared with.
        </p>
      </form>
    </>
  );

  const upgradeBody = (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 bg-muted/20">
      <Card className="p-4 border-primary/15 bg-primary/5">
        <div className="flex gap-3">
          <Lock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-sm">Discussion threads are a Boardroom feature</p>
            <p className="text-sm text-muted-foreground">
              Upgrade to The Boardroom to share analyses with your team and discuss them together —
              right here instead of over email or text.
            </p>
          </div>
        </div>
      </Card>
      <UpgradePrompt
        message="Unlock sharing and team discussion threads with The Boardroom plan."
        feature="sharing"
      />
    </div>
  );

  const body = ownerNeedsUpgrade ? upgradeBody : thread;

  const trigger = (
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
          className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_0_2px_hsl(var(--secondary))] animate-pulse motion-reduce:animate-none"
        />
      )}
    </Button>
  );

  const headerTitle = (
    <span className="flex items-center gap-2.5 tracking-tight">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <MessagesSquare className="h-4 w-4" />
      </span>
      Discussion
    </span>
  );
  const headerDescription = `“${episodeTitle}” — visible to everyone with access to this analysis.`;

  // Mobile: a draggable bottom sheet (grabber, drag-to-dismiss, background
  // page scales back) — the native pattern for discussing a piece of content.
  // Desktop: the familiar right-side panel.
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="h-[92dvh] mt-0 rounded-t-3xl flex flex-col">
          <DrawerHeader className="border-b px-4 py-3 pt-1 text-left">
            <DrawerTitle className="text-base">{headerTitle}</DrawerTitle>
            <DrawerDescription className="line-clamp-1">{headerDescription}</DrawerDescription>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-dvh" side="right">
        <SheetHeader className="glass-nav px-4 sm:px-6 py-4 border-b text-left pr-14">
          <SheetTitle>{headerTitle}</SheetTitle>
          <SheetDescription className="line-clamp-2">{headerDescription}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
};
