/**
 * Native share entry point. Resolves to the best transport available:
 *   1. Despia runtime → despia('share://...') URL scheme (iOS share sheet)
 *   2. Web Share API (mobile Safari, Chrome Android, PWAs)
 *   3. Clipboard fallback (desktop)
 *
 * Always resolves — callers don't need a try/catch.
 */
import despia from "despia-native";
import { isDespia } from "./despiaService";
import { triggerHapticFeedback } from "@/lib/capacitor";

export interface ShareInput {
  title?: string;
  text?: string;
  url?: string;
}

export type ShareResult =
  | { ok: true; transport: "despia" | "webshare" | "clipboard" }
  | { ok: false; reason: "cancelled" | "unsupported" | "error"; error?: unknown };

export async function shareNative(input: ShareInput): Promise<ShareResult> {
  const payload = {
    title: input.title ?? "Founder Mode Advice",
    text: input.text ?? "",
    url: input.url ?? (typeof window !== "undefined" ? window.location.href : ""),
  };

  triggerHapticFeedback("light");

  // 1. Despia native share sheet
  if (isDespia()) {
    try {
      const params = new URLSearchParams({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      despia(`share://present?${params.toString()}`);
      return { ok: true, transport: "despia" };
    } catch (error) {
      console.warn("Despia share failed, falling back:", error);
    }
  }

  // 2. Web Share API
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(payload);
      return { ok: true, transport: "webshare" };
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") {
        return { ok: false, reason: "cancelled" };
      }
      // fall through to clipboard
    }
  }

  // 3. Clipboard fallback
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      const composed = [payload.title, payload.text, payload.url]
        .filter(Boolean)
        .join("\n");
      await navigator.clipboard.writeText(composed);
      return { ok: true, transport: "clipboard" };
    } catch (error) {
      return { ok: false, reason: "error", error };
    }
  }

  return { ok: false, reason: "unsupported" };
}
