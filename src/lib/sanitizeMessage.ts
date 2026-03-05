/**
 * Tool-leak sanitizer for Concierge AI messages.
 * Strips internal JSON tool plans / debug traces from assistant content
 * before rendering to the user.
 */

const TOOL_PLAN_KEYS = [
  "plan_version",
  "actions",
  "booking_assist",
  "idempotency_key",
  "clarify",
  '"type": "tool"',
  '"type": "booking_assist"',
  '"type": "clarify"',
];

/**
 * Detects whether a text block looks like an internal tool-plan JSON.
 */
function looksLikeToolPlan(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return false;
  return TOOL_PLAN_KEYS.some((key) => trimmed.includes(key));
}

/**
 * Strips all JSON tool-plan blocks from the content string.
 * Returns the cleaned text with tool plans removed.
 */
export function sanitizeAssistantContent(content: string): string {
  if (!content) return content;

  // Remove JSON blocks that look like tool plans.
  // Match top-level JSON objects (brace-balanced) that contain tool plan keys.
  let result = content;

  // Strategy: find JSON-like blocks and remove them if they match tool plan patterns
  const jsonBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks: { start: number; end: number; text: string }[] = [];

  // First, catalogue code-fenced blocks (we want to strip tool plans even inside fences)
  let match: RegExpExecArray | null;
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    codeBlocks.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
  }

  // Remove code-fenced blocks that are tool plan JSON
  for (const block of codeBlocks.reverse()) {
    const inner = block.text.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
    if (looksLikeToolPlan(inner)) {
      result = result.slice(0, block.start) + result.slice(block.end);
    }
  }

  // Remove bare (non-fenced) JSON objects that are tool plans
  // Match standalone JSON objects on their own "paragraph" separated by blank lines
  result = result.replace(
    /(?:^|\n\s*\n)\s*\{[\s\S]*?\}\s*(?=\n\s*\n|$)/g,
    (matched) => {
      if (looksLikeToolPlan(matched)) return "";
      return matched;
    },
  );

  // Also catch inline JSON objects at the start of the message
  if (result.trimStart().startsWith("{")) {
    const firstNonJson = findEndOfJson(result.trimStart());
    if (firstNonJson !== -1) {
      const jsonPart = result.trimStart().slice(0, firstNonJson);
      if (looksLikeToolPlan(jsonPart)) {
        const offset = result.length - result.trimStart().length;
        result = result.slice(0, offset) + result.slice(offset + firstNonJson);
      }
    }
  }

  // Clean up excessive whitespace left behind
  result = result.replace(/\n{3,}/g, "\n\n").trim();

  return result;
}

/**
 * Finds the end index of a top-level JSON object in a string.
 * Returns -1 if no balanced object is found.
 */
function findEndOfJson(str: string): number {
  if (str[0] !== "{") return -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * Extracts the safe display text from a ConciergeMessage-like object.
 * Prefers displayText > content, and always sanitizes.
 */
export function getDisplayContent(message: {
  displayText?: string;
  content?: string;
}): string {
  const raw = message.displayText || message.content || "";
  return sanitizeAssistantContent(raw);
}
