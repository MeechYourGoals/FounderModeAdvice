import { useState } from "react";
import { Volume2, VolumeX, Trash2, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDisplayContent } from "@/lib/sanitizeMessage";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ConciergeMessage, MessageAttachment } from "@/types/concierge";

interface MessageBubbleProps {
  message: ConciergeMessage;
  onDelete: (id: string) => void;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
}

function AttachmentCard({ attachment }: { attachment: MessageAttachment }) {
  if (attachment.type === "image") {
    return (
      <div className="rounded-lg overflow-hidden my-2">
        <img
          src={attachment.url}
          alt={attachment.title || ""}
          className="w-full max-h-64 object-cover rounded-lg"
          loading="lazy"
        />
        {attachment.title && (
          <p className="text-xs text-muted-foreground mt-1">
            {attachment.title}
          </p>
        )}
      </div>
    );
  }

  if (attachment.type === "link") {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:text-primary/80 text-sm"
      >
        {attachment.title || attachment.url}
      </a>
    );
  }

  if (attachment.type === "place_card") {
    return (
      <div className="border border-border rounded-lg p-3 my-2 bg-card">
        {attachment.imageUrl && (
          <img
            src={attachment.imageUrl}
            alt={attachment.title || ""}
            className="w-full h-32 object-cover rounded-md mb-2"
            loading="lazy"
          />
        )}
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {attachment.title || "View place"}
        </a>
        {attachment.description && (
          <p className="text-xs text-muted-foreground mt-1">
            {attachment.description}
          </p>
        )}
      </div>
    );
  }

  return null;
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown-to-HTML renderer for common patterns
  const html = markdownToHtml(content);
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none break-words prose-a:text-primary prose-a:underline prose-a:underline-offset-2 prose-img:rounded-lg"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function markdownToHtml(md: string): string {
  let html = md;

  // Escape HTML entities first (prevent XSS)
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headings (### h3, ## h2, # h1)
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links [text](url) — sanitize URLs
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, text, url) => {
      const safeUrl = sanitizeUrl(url);
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  );

  // Unordered lists (• or - or *)
  html = html.replace(/^[\s]*[-*•]\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

  // Ordered lists
  html = html.replace(/^[\s]*\d+\.\s+(.+)$/gm, "<li>$1</li>");
  // Wrap consecutive <li> not already in <ul> into <ol>
  html = html.replace(
    /(?<!<\/ul>)((?:<li>.*<\/li>\n?)+)(?!<\/ul>)/g,
    (match) => {
      // Only wrap if not already wrapped
      if (!match.startsWith("<ul>")) return `<ol>${match}</ol>`;
      return match;
    },
  );

  // Paragraphs: double newlines
  html = html.replace(/\n\n+/g, "</p><p>");
  html = `<p>${html}</p>`;

  // Single newlines within paragraphs to <br>
  html = html.replace(/(?<!<\/[a-z]+>)\n(?!<[a-z])/g, "<br>");

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");

  return html;
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, "https://placeholder.com");
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return url;
    }
    return "#";
  } catch {
    return "#";
  }
}

export function MessageBubble({
  message,
  onDelete,
  onSpeak,
  isSpeaking,
  onStopSpeaking,
}: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const displayContent = isAssistant
    ? getDisplayContent(message)
    : message.content;

  const [speakingThis, setSpeakingThis] = useState(false);

  const handleSpeak = () => {
    if (speakingThis && isSpeaking) {
      onStopSpeaking();
      setSpeakingThis(false);
    } else {
      onSpeak(displayContent);
      setSpeakingThis(true);
    }
  };

  // Reset speaking state when global speaking stops
  if (!isSpeaking && speakingThis) {
    setSpeakingThis(false);
  }

  return (
    <div
      className={cn(
        "flex w-full mb-4",
        isAssistant ? "justify-start" : "justify-end",
      )}
    >
      <div
        className={cn(
          "relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3",
          isAssistant
            ? "bg-card border border-border text-card-foreground"
            : "bg-primary text-primary-foreground",
          // Extra bottom padding for assistant bubbles to make room for TTS button
          isAssistant && "pb-14",
        )}
      >
        {/* Attachments / cards area */}
        {isAssistant &&
          message.attachments &&
          message.attachments.length > 0 && (
            <div className="mb-2">
              {message.attachments.map((att, idx) => (
                <AttachmentCard key={idx} attachment={att} />
              ))}
            </div>
          )}

        {/* Message content */}
        {isAssistant ? (
          <MarkdownContent content={displayContent} />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
        )}

        {/* TTS button - inside assistant bubble, bottom-right */}
        {isAssistant && (
          <button
            onClick={handleSpeak}
            className="absolute right-2 bottom-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={
              speakingThis && isSpeaking
                ? "Stop reading message"
                : "Read message aloud"
            }
          >
            {speakingThis && isSpeaking ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Delete button - separate from TTS, in a "more" menu for assistant messages */}
        {isAssistant ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="absolute left-2 bottom-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Message options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => onDelete(message.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => onDelete(message.id)}
            className="absolute -right-10 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Delete message"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
