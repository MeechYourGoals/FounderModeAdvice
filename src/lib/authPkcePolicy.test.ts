import assert from "node:assert/strict";

const root = new URL("../..", import.meta.url).pathname;

async function read(relativePath: string): Promise<string> {
  return await Deno.readTextFile(`${root}/${relativePath}`);
}

Deno.test("auth PKCE policy — Auth.tsx does not manually exchange OAuth codes", async () => {
  const source = await read("src/pages/Auth.tsx");
  assert.equal(source.includes("exchangeCodeForSession"), false);
  assert.match(source, /PKCE code exchange is owned by the Supabase client/);
});

Deno.test("auth PKCE policy — AuthCallback.tsx does not manually exchange OAuth codes", async () => {
  const source = await read("src/pages/AuthCallback.tsx");
  assert.equal(source.includes("exchangeCodeForSession"), false);
  assert.match(source, /detectSessionInUrl/);
});

Deno.test("auth PKCE policy — web redirectTo uses apex /auth not /auth/callback", async () => {
  const source = await read("src/lib/appMode.ts");
  assert.match(source, /return `\$\{getCanonicalWebOrigin\(\)\}\/auth`;/);
  assert.equal(source.includes("getCanonicalOrigin"), false);
});

Deno.test("auth PKCE policy — web OAuth does not override Apple client_id", async () => {
  const source = await read("src/lib/webOAuthBuild.ts");
  assert.equal(source.includes("queryParams"), false);
  assert.equal(source.includes("client_id"), false);
});
