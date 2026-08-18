import assert from "node:assert/strict";
import {
  homePanelFromLocationState,
  mobileNavActiveTab,
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
