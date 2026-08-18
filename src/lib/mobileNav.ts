/** Home panels the bottom nav can open without adding a new route. */
export type HomePanel = "profiles" | "bookmarks";

export type MobileNavTab = "profiles" | "saved" | "briefing" | "settings" | null;

type LocationStateWithPanel = {
  panel?: unknown;
};

/**
 * Which bottom-nav tab should look selected.
 *
 * Briefing and Settings stay route-based. Profiles and Saved are overlays on
 * `/` — they highlight only while that panel is the open home sheet.
 */
export function mobileNavActiveTab(
  pathname: string,
  panel: string | null | undefined,
): MobileNavTab {
  if (pathname.startsWith("/discover")) return "briefing";
  if (pathname.startsWith("/settings") || pathname.startsWith("/account")) return "settings";
  if (pathname === "/") {
    if (panel === "profiles") return "profiles";
    if (panel === "bookmarks") return "saved";
  }
  return null;
}

/** Read the home-sheet panel from react-router location.state. */
export function homePanelFromLocationState(state: unknown): HomePanel | null {
  const panel = (state as LocationStateWithPanel | null | undefined)?.panel;
  if (panel === "profiles" || panel === "bookmarks") return panel;
  return null;
}
