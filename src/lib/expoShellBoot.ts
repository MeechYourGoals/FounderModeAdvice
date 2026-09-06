import { isExpoShell } from "@/services/expoShellService";

/** Strip PWA service workers inside the Expo shell WebView (stale SW → blank screen). */
export async function purgeExpoShellServiceWorkers(): Promise<void> {
  if (!isExpoShell() || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[expo-shell] SW purge failed", err);
  }
}

const BOOT_ERROR_STYLES = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  padding: "24px",
  textAlign: "center" as const,
  background: "#0c0e15",
  color: "#e7e9f0",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

function renderBootError(message?: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.setAttribute("role", "alert");
  Object.assign(wrap.style, BOOT_ERROR_STYLES);

  const title = document.createElement("p");
  title.textContent = "Something went wrong on our side.";
  title.style.cssText = "font-size:1.25rem;font-weight:600;margin:0";
  wrap.appendChild(title);

  const body = document.createElement("p");
  body.textContent =
    message ??
    "Your analyses and bookmarks are safe. Reload to pick up where you left off.";
  body.style.cssText = "font-size:0.9rem;color:#9aa1b5;max-width:26rem;margin:0";
  wrap.appendChild(body);

  const btn = document.createElement("button");
  btn.textContent = "Reload";
  btn.style.cssText =
    "margin-top:8px;padding:10px 28px;border-radius:9999px;border:none;background:#6d5cff;color:#fff;font-size:1rem;font-weight:600;cursor:pointer";
  btn.onclick = () => window.location.reload();
  wrap.appendChild(btn);

  root.appendChild(wrap);
}

/** Catch module-load failures before React mounts (AppErrorBoundary is too late). */
export function installExpoShellBootErrorHandlers(): void {
  if (!isExpoShell() || typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    if (event.defaultPrevented) return;
    renderBootError();
  });

  window.addEventListener("unhandledrejection", () => {
    renderBootError();
  });
}
