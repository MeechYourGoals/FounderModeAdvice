import { assertEquals, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { writeUserSubscriptionTier } from "./revenuecat.ts";

function mockWriteClient(opts: { admin?: boolean; error?: string; upsertError?: string }) {
  const writes: Array<Record<string, unknown>> = [];
  return {
    writes,
    from(table: string) {
      if (table === "user_roles") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
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
      }
      return {
        async upsert(row: Record<string, unknown>) {
          writes.push(row);
          return { error: opts.upsertError ? { message: opts.upsertError } : null };
        },
      };
    },
  };
}

Deno.test("writeUserSubscriptionTier keeps series_z for admins", async () => {
  const admin = mockWriteClient({ admin: true });
  const tier = await writeUserSubscriptionTier(admin, "user-1", "free", null);
  assertEquals(tier, "series_z");
  assertEquals(admin.writes[0].tier, "series_z");
});

Deno.test("writeUserSubscriptionTier persists the billing tier for non-admins", async () => {
  const client = mockWriteClient({ admin: false });
  const tier = await writeUserSubscriptionTier(client, "user-1", "seed", "2026-09-01T00:00:00Z");
  assertEquals(tier, "seed");
  assertEquals(client.writes[0].tier, "seed");
});

Deno.test("writeUserSubscriptionTier refuses a downgrade when roles cannot be read", async () => {
  await assertRejects(
    () => writeUserSubscriptionTier(mockWriteClient({ error: "timeout" }), "user-1", "free", null),
    Error,
    "user_roles admin lookup failed",
  );
});
