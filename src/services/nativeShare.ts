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
import { isExpoShell, shareViaShell } from "./expoShellService";
import { triggerHapticFeedback } from "@/lib/capacitor";

export interface ShareInput {
  title?: string;
  text?: string;
  url?: string;
  /** An image (e.g. a generated share card) to attach where the platform supports it. */
  file?: File;
}

export type ShareResult =
  | { ok: true; transport: "despia" | "shell" | "webshare" | "clipboard" }
  | { ok: false; reason: "cancelled" | "unsupported" | "error"; error?: unknown };

/** File -> data: URL, for bridges that only accept a string payload (Expo shell). */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function shareNative(input: ShareInput): Promise<ShareResult> {
  const payload = {
    title: input.title ?? "Founder Mode Advice",
    text: input.text ?? "",
    url: input.url ?? (typeof window !== "undefined" ? window.location.href : ""),
  };

  triggerHapticFeedback("light");

  // 1. Despia native share sheet (no image attachment support today — link+text only)
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

  // 2. Expo shell native share sheet (WebViews often lack navigator.share)
  if (isExpoShell()) {
    const imageDataUrl = input.file ? await fileToDataUrl(input.file).catch(() => undefined) : undefined;
    if (shareViaShell({ ...payload, imageDataUrl })) {
      return { ok: true, transport: "shell" };
    }
  }

  // 3. Web Share API — prefer sharing the image file when the platform supports it.
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      if (input.file && typeof navigator.canShare === "function" && navigator.canShare({ files: [input.file] })) {
        await navigator.share({ title: payload.title, text: payload.text, url: payload.url, files: [input.file] });
      } else {
        await navigator.share(payload);
      }
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
