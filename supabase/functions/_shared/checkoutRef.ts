// Server-signed checkout reference.
//
// Paddle customData is client-controlled, so a raw `userId` in it can be
// swapped in devtools to target another account. Instead the (JWT-verified)
// price lookup function mints a short-lived HMAC-signed reference bound to the
// authenticated user, and the webhook only trusts a reference it can verify.
//
// The HMAC key is the service role key: present in both edge functions, never
// exposed to clients, and never returned in any response.

const encoder = new TextEncoder();
const TTL_MS = 6 * 60 * 60 * 1000; // 6h — long enough to finish a checkout.

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function key(): Promise<CryptoKey> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signCheckoutRef(userId: string): Promise<string> {
  const payload = b64url(encoder.encode(JSON.stringify({ uid: userId, exp: Date.now() + TTL_MS })));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await key(), encoder.encode(payload)));
  return `${payload}.${b64url(sig)}`;
}

/** Returns the bound user id, or null when the reference is missing/invalid/expired. */
export async function verifyCheckoutRef(ref: unknown): Promise<string | null> {
  if (typeof ref !== 'string' || !ref.includes('.')) return null;
  const [payload, sig] = ref.split('.');
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(), fromB64url(sig), encoder.encode(payload));
    if (!ok) return null;
    const parsed = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { uid?: string; exp?: number };
    if (!parsed?.uid || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}
