import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { useToast } from "@/hooks/use-toast";
import { AtSign, Globe2, Loader2, Lock, MessageSquare, Pencil, Send, Trash2, X } from "lucide-react";
import type { InsightCommentsApi } from "@/hooks/useInsightComments";
import type { CommentVisibility, InsightType } from "@/services/insightComments";

interface InsightCommentsProps {
  api: InsightCommentsApi;
  insightType: InsightType;
  insightId: string;
  /** Whether the current user may write comments (RLS enforces regardless). */
  canComment: boolean;
  /** Owner on a non-Boardroom plan: show the upgrade path instead of the composer. */
  ownerNeedsUpgrade?: boolean;
  /** Whether the current user owns the episode (may moderate any comment). */
  isOwner?: boolean;
}

export const InsightComments = ({
  api,
  insightType,
  insightId,
  canComment,
  ownerNeedsUpgrade = false,
  isOwner = false,
}: InsightCommentsProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<CommentVisibility>("shared");
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const comments = api.commentsFor(insightType, insightId);
  const mentionCandidates = useMemo(
    () => api.collaborators.filter((c) => c.user_id !== api.currentUserId),
    [api.collaborators, api.currentUserId],
  );

  const toggleMention = (userId: string, email: string) => {
    setMentionIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
    setBody((prev) => (prev.includes(`@${email}`) ? prev : `${prev}${prev.endsWith(" ") || prev === "" ? "" : " "}@${email} `));
    setMentionOpen(false);
  };

  const handleSubmit = async () => {
    if (!body.trim() || saving) return;
    setSaving(true);
    try {
      await api.addComment({ insightType, insightId, body, visibility, mentionedUserIds: mentionIds });
      setBody("");
      setMentionIds([]);
    } catch (err: unknown) {
      toast({
        title: "Could not post note",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editBody.trim() || saving) return;
    setSaving(true);
    try {
      await api.editComment(editingId, editBody);
      setEditingId(null);
      setEditBody("");
    } catch (err: unknown) {
      toast({
        title: "Could not update note",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await api.removeComment(commentId);
    } catch (err: unknown) {
      toast({
        title: "Could not delete note",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="h-6 px-2 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground/20"
        aria-expanded={open}
      >
        <MessageSquare className="w-3 h-3 mr-1" />
        {comments.length > 0 ? `Notes (${comments.length})` : "Add note"}
      </Button>

      {open && (
        <div className="mt-2 space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
          {api.loading && comments.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading notes…
            </div>
          ) : api.error ? (
            <p className="py-1 text-xs text-destructive">{api.error}</p>
          ) : comments.length === 0 ? (
            <p className="py-1 text-xs text-muted-foreground">
              No notes yet. Capture a thought or loop in a teammate.
            </p>
          ) : (
            <ul className="space-y-2">
              {comments.map((comment) => {
                const own = comment.author_user_id === api.currentUserId;
                return (
                  <li key={comment.id} className="rounded-lg bg-background/70 border border-border/50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-[11px] font-medium text-foreground/90">
                          {api.labelFor(comment.author_user_id)}
                        </span>
                        {comment.visibility === "private" && (
                          <Badge variant="outline" className="gap-1 px-1.5 text-[9px]">
                            <Lock className="h-2.5 w-2.5" /> Private
                          </Badge>
                        )}
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {own && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            aria-label="Edit note"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditBody(comment.body);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {(own || isOwner) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            aria-label="Delete note"
                            onClick={() => void handleDelete(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {editingId === comment.id ? (
                      <div className="mt-1.5 space-y-1.5">
                        <Textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={2}
                          className="min-h-0 text-xs"
                        />
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-6 px-2 text-[11px]" disabled={saving} onClick={() => void handleSaveEdit()}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => {
                              setEditingId(null);
                              setEditBody("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">{comment.body}</p>
                    )}

                    {comment.insight_comment_mentions && comment.insight_comment_mentions.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {comment.insight_comment_mentions.map((m) => (
                          <Badge key={m.mentioned_user_id} variant="secondary" className="gap-0.5 px-1.5 text-[9px]">
                            <AtSign className="h-2.5 w-2.5" />
                            {api.labelFor(m.mentioned_user_id)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {ownerNeedsUpgrade ? (
            <UpgradePrompt
              compact
              feature="sharing"
              message="Notes, comments & teammate tagging are a Boardroom feature."
            />
          ) : canComment ? (
            <div className="space-y-1.5 pt-1">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={visibility === "private" ? "Write a private note…" : "Comment for everyone with access…"}
                rows={2}
                className="min-h-0 text-xs"
              />
              {mentionIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {mentionIds.map((id) => (
                    <Badge key={id} variant="secondary" className="gap-1 px-1.5 text-[9px]">
                      <AtSign className="h-2.5 w-2.5" />
                      {api.labelFor(id)}
                      <button
                        aria-label="Remove mention"
                        onClick={() => setMentionIds((prev) => prev.filter((x) => x !== id))}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => setVisibility((v) => (v === "shared" ? "private" : "shared"))}
                  aria-label="Toggle note visibility"
                >
                  {visibility === "shared" ? (
                    <>
                      <Globe2 className="mr-1 h-3 w-3" /> Shared
                    </>
                  ) : (
                    <>
                      <Lock className="mr-1 h-3 w-3" /> Private
                    </>
                  )}
                </Button>

                {visibility === "shared" && mentionCandidates.length > 0 && (
                  <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        <AtSign className="mr-1 h-3 w-3" /> Tag teammate
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search teammates…" />
                        <CommandList>
                          <CommandEmpty className="px-3 py-2 text-xs text-muted-foreground">
                            No teammates with access yet. Share this analysis or its folder to add some.
                          </CommandEmpty>
                          <CommandGroup heading="People with access">
                            {mentionCandidates.map((c) => (
                              <CommandItem key={c.user_id} onSelect={() => toggleMention(c.user_id, c.email)}>
                                <AtSign className="mr-2 h-3 w-3" />
                                <span className="truncate">{c.email}</span>
                                {c.is_owner && (
                                  <Badge variant="outline" className="ml-auto text-[9px]">
                                    Owner
                                  </Badge>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}

                <Button
                  size="sm"
                  className="ml-auto h-6 px-2.5 text-[11px]"
                  disabled={saving || !body.trim()}
                  onClick={() => void handleSubmit()}
                >
                  {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
                  Post
                </Button>
              </div>
            </div>
          ) : (
            <p className="pt-1 text-[11px] text-muted-foreground">You have view-only access to this analysis.</p>
          )}
        </div>
      )}
    </div>
  );
};
