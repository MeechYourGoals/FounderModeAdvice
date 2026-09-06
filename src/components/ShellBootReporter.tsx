import { useEffect } from "react";
import { isExpoShell, notifyShellReady } from "@/services/expoShellService";

/**
 * Tells the native Expo shell the SPA has painted so it can hide the splash
 * screen (instead of hiding on HTML load alone).
 */
export function ShellBootReporter() {
  useEffect(() => {
    if (!isExpoShell()) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        notifyShellReady();
      });
    });
  }, []);
  return null;
}
