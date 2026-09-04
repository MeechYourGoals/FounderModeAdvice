import assert from "node:assert/strict";
import { authErrorMessage } from "@/lib/authErrors.ts";

Deno.test("auth errors use fixed non-enumerating copy", () => {
  assert.equal(
    authErrorMessage("password"),
    "We couldn't sign you in. Check your details and try again.",
  );
  assert.equal(
    authErrorMessage("signup"),
    "We couldn't create your account. Check your details and try again.",
  );
  assert.equal(
    authErrorMessage("reset"),
    "If an account exists for that email, we'll send a password reset link.",
  );
});
