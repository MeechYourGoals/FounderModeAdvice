import assert from "node:assert/strict";
import { isSameAuthUser } from "@/lib/authUser.ts";

Deno.test("isSameAuthUser — same reference is the same user", () => {
  const user = { id: "u1", email: "a@example.com", updated_at: "1" };
  assert.equal(isSameAuthUser(user, user), true);
});

Deno.test("isSameAuthUser — TOKEN_REFRESHED clones are the same identity", () => {
  assert.equal(
    isSameAuthUser(
      { id: "u1", email: "a@example.com", updated_at: "2026-01-01T00:00:00Z" },
      { id: "u1", email: "a@example.com", updated_at: "2026-01-01T00:00:00Z" },
    ),
    true,
  );
});

Deno.test("isSameAuthUser — login, logout, and profile edits are new identities", () => {
  const user = { id: "u1", email: "a@example.com", updated_at: "1" };
  assert.equal(isSameAuthUser(null, user), false);
  assert.equal(isSameAuthUser(user, null), false);
  assert.equal(isSameAuthUser(user, { ...user, id: "u2" }), false);
  assert.equal(isSameAuthUser(user, { ...user, email: "b@example.com" }), false);
  assert.equal(isSameAuthUser(user, { ...user, updated_at: "2" }), false);
});
