import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { buildPushPayload, sendPush } from "./oneSignal.ts";

Deno.test("buildPushPayload targets deduplicated external ids using the current API shape", () => {
  assertEquals(
    buildPushPayload({
      appId: "app-id",
      apiKey: "unused",
      externalIds: ["user-a", "user-a", "user-b"],
      heading: "New reply",
      content: "A teammate replied.",
      path: "/shared-analysis/episode-id?utm_source=push",
      idempotencyKey: "message-id",
    }),
    {
      app_id: "app-id",
      target_channel: "push",
      include_aliases: { external_id: ["user-a", "user-b"] },
      headings: { en: "New reply" },
      contents: { en: "A teammate replied." },
      url: "https://foundermodeadvice.com/shared-analysis/episode-id?utm_source=push",
      data: { path: "/shared-analysis/episode-id?utm_source=push" },
      idempotency_key: "message-id",
    },
  );
});

Deno.test("sendPush uses OneSignal's current endpoint and Key authorization", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedInit = init;
    return new Response(JSON.stringify({ id: "notification-id" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const result = await sendPush(
    {
      appId: "app-id",
      apiKey: "api-key",
      externalIds: ["user-a"],
      heading: "Heading",
      content: "Content",
      path: "/discover",
    },
    fakeFetch,
  );

  assertEquals(result.id, "notification-id");
  assertEquals(capturedUrl, "https://api.onesignal.com/notifications");
  assertEquals(new Headers(capturedInit?.headers).get("Authorization"), "Key api-key");
});
