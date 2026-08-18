import { assertEquals, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  applyAdminTierFloor,
  lookupAdminRole,
  protectAdminSubscriptionTier,
  userHasAdminRole,
} from "./admin.ts";

function mockRoleClient(opts: { admin?: boolean; error?: string }) {
  return {
    from(_table: string) {
      return {
        select(_columns: string) {
          return {
            eq(_column: string, _value: string) {
              return {
                eq(_column2: string, _value2: string) {
                  return {
                    async maybeSingle() {
                      if (opts.error) return { data: null, error: { message: opts.error } };
                      return { data: opts.admin ? { role: "admin" } : null, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

Deno.test("applyAdminTierFloor keeps series_z for admins only", () => {
  assertEquals(applyAdminTierFloor(true, "free"), "series_z");
  assertEquals(applyAdminTierFloor(true, "seed"), "series_z");
  assertEquals(applyAdminTierFloor(true, "series_z"), "series_z");
  assertEquals(applyAdminTierFloor(false, "free"), "free");
  assertEquals(applyAdminTierFloor(false, "seed"), "seed");
});

Deno.test("lookupAdminRole reads user_roles.role = admin", async () => {
  assertEquals(await lookupAdminRole(mockRoleClient({ admin: true }), "user-1"), true);
  assertEquals(await lookupAdminRole(mockRoleClient({ admin: false }), "user-1"), false);
});

Deno.test("lookupAdminRole throws when the role table is unavailable", async () => {
  await assertRejects(
    () => lookupAdminRole(mockRoleClient({ error: "connection refused" }), "user-1"),
    Error,
    "user_roles admin lookup failed",
  );
});

Deno.test("userHasAdminRole fails closed on lookup errors", async () => {
  assertEquals(await userHasAdminRole(mockRoleClient({ error: "connection refused" }), "user-1"), false);
  assertEquals(await userHasAdminRole(mockRoleClient({ admin: true }), "user-1"), true);
});

Deno.test("protectAdminSubscriptionTier never downgrades an admin", async () => {
  const adminClient = mockRoleClient({ admin: true });
  assertEquals(await protectAdminSubscriptionTier(adminClient, "user-1", "free"), "series_z");
  assertEquals(await protectAdminSubscriptionTier(adminClient, "user-1", "seed"), "series_z");
  assertEquals(await protectAdminSubscriptionTier(adminClient, "user-1", "series_z"), "series_z");
});

Deno.test("protectAdminSubscriptionTier leaves non-admins unchanged", async () => {
  const client = mockRoleClient({ admin: false });
  assertEquals(await protectAdminSubscriptionTier(client, "user-1", "free"), "free");
  assertEquals(await protectAdminSubscriptionTier(client, "user-1", "seed"), "seed");
});

Deno.test("protectAdminSubscriptionTier refuses to write a downgrade when roles cannot be read", async () => {
  await assertRejects(
    () => protectAdminSubscriptionTier(mockRoleClient({ error: "timeout" }), "user-1", "free"),
    Error,
    "user_roles admin lookup failed",
  );
});
