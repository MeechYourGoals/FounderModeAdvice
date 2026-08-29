export interface PushMessage {
  appId: string;
  apiKey: string;
  externalIds: string[];
  heading: string;
  content: string;
  path: string;
  idempotencyKey?: string;
}

export interface OneSignalResponse {
  id?: string;
  errors?: unknown;
  [key: string]: unknown;
}

/** Current OneSignal Create Message payload for authenticated-user push. */
export function buildPushPayload(message: PushMessage): Record<string, unknown> {
  const uniqueExternalIds = [...new Set(message.externalIds.filter(Boolean))];
  return {
    app_id: message.appId,
    target_channel: "push",
    include_aliases: { external_id: uniqueExternalIds },
    headings: { en: message.heading },
    contents: { en: message.content },
    url: `https://foundermodeadvice.com${message.path}`,
    data: { path: message.path },
    ...(message.idempotencyKey ? { idempotency_key: message.idempotencyKey } : {}),
  };
}

/** Send one push message to OneSignal External IDs. */
export async function sendPush(
  message: PushMessage,
  fetchImpl: typeof fetch = fetch,
): Promise<OneSignalResponse> {
  if (message.externalIds.length === 0) return {};

  const response = await fetchImpl("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${message.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildPushPayload(message)),
  });

  const payload = (await response.json().catch(() => ({}))) as OneSignalResponse;
  if (!response.ok) {
    throw new Error(`OneSignal request failed (${response.status}): ${JSON.stringify(payload.errors ?? payload)}`);
  }
  return payload;
}
