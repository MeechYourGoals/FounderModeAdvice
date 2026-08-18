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

/**
 * Whether homepage overlay state should be written again.
 *
 * After dismiss, location.state is cleared. Re-opening the same panel must
 * navigate — otherwise Profiles/Saved stay unhighlighted. Skip only when
 * the URL already matches (avoids a no-op replace).
 */
export function shouldPublishHomePanel(
  currentState: unknown,
  panel: HomePanel | null,
): boolean {
  return homePanelFromLocationState(currentState) !== panel;
}

/**
 * Next `location.state` after a home-panel publish.
 *
 * `undefined` means skip navigate (already on that panel). `null` clears
 * the overlay after dismiss. A `{ panel }` object is what reopen must write
 * so the tab highlight comes back.
 */
export function nextHomePanelLocationState(
  currentState: unknown,
  panel: HomePanel | null,
): { panel: HomePanel } | null | undefined {
  if (!shouldPublishHomePanel(currentState, panel)) return undefined;
  return panel ? { panel } : null;
}
