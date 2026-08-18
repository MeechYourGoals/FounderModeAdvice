import assert from "node:assert/strict";
import { getBoardMeetingMemoTitle, isUniversalAnalysis } from "@/lib/analysisProfile.ts";

Deno.test("advice title — companion voice, not board-meeting jargon", () => {
  assert.equal(getBoardMeetingMemoTitle({}), "Advice for you");
  assert.equal(
    getBoardMeetingMemoTitle({ analyzed_profile_name_snapshot: "Northwind" }),
    "Advice for Northwind",
  );
  assert.equal(isUniversalAnalysis({}), true);
  assert.equal(isUniversalAnalysis({ analyzed_profile_id: "p1" }), false);
});
