/**
 * TOKEN_REFRESHED (and some getSession snapshots) hand back a new user object
 * with the same identity. Treating that as a new user recreates every callback
 * that listed `user` in its dependency array and can retrigger loads forever.
 */
export function isSameAuthUser(
  a: { id: string; email?: string | null; updated_at?: string | null } | null | undefined,
  b: { id: string; email?: string | null; updated_at?: string | null } | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && (a.email ?? null) === (b.email ?? null) && (a.updated_at ?? null) === (b.updated_at ?? null);
}
