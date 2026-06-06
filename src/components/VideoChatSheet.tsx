import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageSquare, RefreshCw, Send, ShieldCheck, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { cn } from "@/lib/utils";

interface VideoChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface VideoChatSheetProps {
  videoId: string;
  videoTitle: string;
}

const SUGGESTED_QUESTIONS = [
  "What would this advice imply for my GTM?",
  "Summarize the advice for a pre-seed founder.",
  "What assumptions does this video challenge?",
  "What should I do next based on this video?",
];

const resolveInvokeError = async (error: any, fallback: string) => {
  const response = error?.context;
  if (response && typeof response.json === "function") {
    try {
      const body = await response.json();
      if (body?.error) return body.error as string;
    } catch {
      // Fall through to the provider error below.
    }
  }

  return error?.message || fallback;
};

export const VideoChatSheet = ({ videoId, videoTitle }: VideoChatSheetProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<VideoChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTranscript, setHasTranscript] = useState<boolean | null>(null);
  const lastQuestionRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  useEffect(() => {
    if (open) {
      void loadHistory();
    }
  }, [open, videoId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("video-chat", {
        body: { action: "history", videoId },
      });

      if (invokeError) {
        throw new Error(await resolveInvokeError(invokeError, "Could not load this video's chat history."));
      }
      if (data?.error) throw new Error(data.error);

      setMessages(data?.messages || []);
      setHasTranscript(Boolean(data?.hasTranscript));
    } catch (historyError: any) {
      console.error("Video chat history error:", historyError);
      setError(historyError.message || "Could not load this video's chat history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendQuestion = async (question = draft) => {
    const trimmed = question.trim();
    if (!trimmed || sending) return;

    lastQuestionRef.current = trimmed;
    setDraft("");
    setError(null);
    setSending(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("video-chat", {
        body: { action: "ask", videoId, message: trimmed },
      });

      if (invokeError) {
        throw new Error(await resolveInvokeError(invokeError, "Ask this video failed. Please retry."));
      }
      if (data?.error) throw new Error(data.error);

      setMessages((current) => [...current, data.message]);
      setHasTranscript(true);
    } catch (sendError: any) {
      console.error("Video chat send error:", sendError);
      const message = sendError.message || "Ask this video failed. Please retry.";
      if (message.toLowerCase().includes("transcript")) {
        setHasTranscript(false);
      }
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const retryLastQuestion = () => {
    if (lastQuestionRef.current) {
      void sendQuestion(lastQuestionRef.current);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="sm:size-default flex-1 sm:flex-initial">
          <MessageSquare className="w-4 h-4 mr-2" />
          Ask this video
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-dvh" side="right">
        <SheetHeader className="px-4 sm:px-6 py-4 border-b text-left pr-14">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Ask this video
          </SheetTitle>
          <SheetDescription className="line-clamp-2">
            Transcript-grounded Q&amp;A for “{videoTitle}”. Answers should cite the video context, not claim private advisor access.
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 bg-muted/20">
          {loadingHistory ? (
            <Card className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading video chat...
            </Card>
          ) : messages.length === 0 ? (
            <div className="space-y-4">
              <Card className="p-4 border-primary/15 bg-primary/5">
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Grounded in this video transcript</p>
                    <p className="text-sm text-muted-foreground">
                      Ask follow-up questions about the selected video. If the transcript does not support an answer, the assistant is instructed to say so.
                    </p>
                    {hasTranscript === false && (
                      <p className="text-sm text-destructive">
                        No transcript is available for this video yet. Re-analyze a YouTube video with captions, then retry Ask this video.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Try asking</p>
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="w-full text-left rounded-lg border bg-card p-3 text-sm hover:bg-primary/5 hover:border-primary/30 transition-colors"
                    onClick={() => void sendQuestion(question)}
                    disabled={sending || hasTranscript === false}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id || `${message.role}-${index}`}
                className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "assistant" && (
                  <div className="mt-1 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border shadow-sm",
                  )}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <div className="mt-1 h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="mt-1 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-card border shadow-sm rounded-2xl px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reading the transcript...
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 sm:px-6 py-3 border-t bg-destructive/5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-destructive">{error}</p>
              {lastQuestionRef.current && (
                <Button variant="outline" size="sm" onClick={retryLastQuestion} disabled={sending}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                </Button>
              )}
            </div>
          </div>
        )}

        <form
          className="px-4 sm:px-6 py-4 border-t bg-background pb-[calc(1rem+var(--safe-area-bottom))]"
          onSubmit={(event) => {
            event.preventDefault();
            void sendQuestion();
          }}
        >
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={hasTranscript === false ? "Transcript unavailable for this video" : "Ask a follow-up grounded in this video..."}
              className="min-h-[48px] max-h-32 resize-none"
              disabled={sending || loadingHistory || hasTranscript === false}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendQuestion();
                }
              }}
            />
            <Button type="submit" size="icon" disabled={!draft.trim() || sending || loadingHistory || hasTranscript === false}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Answers are generated from the selected transcript and app insights. They are not personal advice from the speaker.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
};
