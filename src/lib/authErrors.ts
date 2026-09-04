export type AuthOperation = "apple" | "google" | "password" | "signup" | "reset";

const AUTH_ERROR_MESSAGES: Record<AuthOperation, string> = {
  apple: "We couldn't complete Apple sign-in. Please try again.",
  google: "We couldn't complete Google sign-in. Please try again.",
  password: "We couldn't sign you in. Check your details and try again.",
  signup: "We couldn't create your account. Check your details and try again.",
  reset: "If an account exists for that email, we'll send a password reset link.",
};

/**
 * Auth provider/database errors can disclose account existence or backend
 * configuration. UI surfaces use fixed copy and keep raw errors in telemetry.
 */
export function authErrorMessage(operation: AuthOperation): string {
  return AUTH_ERROR_MESSAGES[operation];
}
