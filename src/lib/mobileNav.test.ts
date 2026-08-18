import assert from "node:assert/strict";
import {
  homePanelFromLocationState,
  mobileNavActiveTab,
  nextHomePanelLocationState,
  shouldPublishHomePanel,
} from "@/lib/mobileNav.ts";

Deno.test("mobileNavActiveTab — briefing and settings stay route-based", () => {
  assert.equal(mobileNavActiveTab("/discover", null), "briefing");
  assert.equal(mobileNavActiveTab("/discover", "profiles"), "briefing");
  assert.equal(mobileNavActiveTab("/settings", "bookmarks"), "settings");
  assert.equal(mobileNavActiveTab("/account", null), "settings");
});

Deno.test("mobileNavActiveTab — profiles and saved follow the open home panel", () => {
  assert.equal(mobileNavActiveTab("/", null), null);
  assert.equal(mobileNavActiveTab("/", "profiles"), "profiles");
  assert.equal(mobileNavActiveTab("/", "bookmarks"), "saved");
  assert.equal(mobileNavActiveTab("/faq", "profiles"), null);
});

Deno.test("homePanelFromLocationState — only profiles and bookmarks count", () => {
  assert.equal(homePanelFromLocationState(null), null);
  assert.equal(homePanelFromLocationState({ panel: "profiles" }), "profiles");
  assert.equal(homePanelFromLocationState({ panel: "bookmarks", ts: 1 }), "bookmarks");
  assert.equal(homePanelFromLocationState({ panel: "subscription" }), null);
  assert.equal(homePanelFromLocationState({ action: "analyze" }), null);
});

Deno.test("shouldPublishHomePanel — republish after dismiss so the tab highlights again", () => {
  // Mounted with the sheet open, then dismissed (location.state cleared).
  const afterDismiss = undefined;
  assert.equal(homePanelFromLocationState(afterDismiss), null);
  assert.equal(shouldPublishHomePanel(afterDismiss, "profiles"), true);
  assert.equal(shouldPublishHomePanel(afterDismiss, "bookmarks"), true);
  // Already published: skip the no-op replace.
  assert.equal(shouldPublishHomePanel({ panel: "profiles" }, "profiles"), false);
  assert.equal(shouldPublishHomePanel({ panel: "bookmarks" }, "bookmarks"), false);
  // Switching panels or dismissing still publishes.
  assert.equal(shouldPublishHomePanel({ panel: "profiles" }, "bookmarks"), true);
  assert.equal(shouldPublishHomePanel({ panel: "profiles" }, null), true);
  assert.equal(shouldPublishHomePanel(null, null), false);
});

Deno.test("nextHomePanelLocationState — mount with panel, dismiss, openProfiles restores it", () => {
  // Land on / with the sheet already open (Discover/Settings CTA).
  let state: unknown = { panel: "profiles" };
  assert.equal(homePanelFromLocationState(state), "profiles");
  assert.equal(mobileNavActiveTab("/", homePanelFromLocationState(state)), "profiles");
  // Same-panel publish at mount is a no-op.
  assert.equal(nextHomePanelLocationState(state, "profiles"), undefined);

  // Dismiss clears location.state — tab unhighlights.
  const dismissed = nextHomePanelLocationState(state, null);
  assert.equal(dismissed, null);
  state = dismissed;
  assert.equal(homePanelFromLocationState(state), null);
  assert.equal(mobileNavActiveTab("/", homePanelFromLocationState(state)), null);

  // Window `openProfiles` after dismiss must republish so the tab highlights.
  const reopened = nextHomePanelLocationState(state, "profiles");
  assert.deepEqual(reopened, { panel: "profiles" });
  state = reopened;
  assert.equal(homePanelFromLocationState(state), "profiles");
  assert.equal(mobileNavActiveTab("/", homePanelFromLocationState(state)), "profiles");
});
