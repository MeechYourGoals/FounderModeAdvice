export interface MessageAttachment {
  type: "image" | "link" | "place_card";
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
}

export interface ConciergeMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  displayText?: string;
  attachments?: MessageAttachment[];
  timestamp: Date;
  /** Internal fields that should NEVER be rendered */
  tool?: unknown;
  plan?: unknown;
  actions?: unknown;
  debug?: unknown;
  metadata?: unknown;
  raw?: unknown;
}
