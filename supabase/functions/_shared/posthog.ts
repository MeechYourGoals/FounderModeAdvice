/**
 * PostHog person-erasure response verification.
 *
 * `POST /api/projects/{id}/persons/bulk_delete/` may answer with an empty body
 * (queued) or a JSON summary. Only a strictly consistent summary counts as a
 * verified deletion; anything else is rejected so account deletion never
 * reports success it cannot prove.
 *
 * Errors returned here are sanitized — they never carry the raw response body
 * or the personal API key.
 */

export type PostHogDeleteVerification =
  | { ok: true; detail: "empty-body" | "verified" | "no-op" }
  | { ok: false; reason: string };

const isNonNegativeInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/**
 * Verify a 2xx bulk_delete response body.
 * @param rawBody Response text exactly as returned (may be empty).
 */
export function verifyBulkDeleteBody(rawBody: string): PostHogDeleteVerification {
  const body = (rawBody ?? "").trim();
  if (body.length === 0) return { ok: true, detail: "empty-body" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, reason: "malformed-json" };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "unexpected-body-shape" };
  }

  const payload = parsed as Record<string, unknown>;

  const deletionErrors = payload.deletion_errors;
  if (deletionErrors !== undefined && deletionErrors !== null) {
    const empty = Array.isArray(deletionErrors)
      ? deletionErrors.length === 0
      : typeof deletionErrors === "object"
        ? Object.keys(deletionErrors as Record<string, unknown>).length === 0
        : false;
    if (!empty) return { ok: false, reason: "deletion-errors-present" };
  }

  const found = payload.persons_found;
  const deleted = payload.persons_deleted;

  // A summary body must report both counts as nonnegative integers.
  if (found === undefined && deleted === undefined) {
    return { ok: false, reason: "missing-counts" };
  }
  if (!isNonNegativeInt(found) || !isNonNegativeInt(deleted)) {
    return { ok: false, reason: "invalid-counts" };
  }
  if (deleted > found) return { ok: false, reason: "deleted-exceeds-found" };
  if (deleted !== found) return { ok: false, reason: "incomplete-deletion" };

  if (found === 0) return { ok: true, detail: "no-op" };

  if (
    payload.events_queued_for_deletion !== true ||
    payload.recordings_queued_for_deletion !== true
  ) {
    return { ok: false, reason: "history-not-queued" };
  }

  return { ok: true, detail: "verified" };
}
