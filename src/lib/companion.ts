export type TimeOfDayGreeting = "Good morning" | "Good afternoon" | "Good evening";

export function timeOfDayGreeting(date = new Date()): TimeOfDayGreeting {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type NameSource = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

/** First name from auth metadata, then the email local-part. */
export function firstNameFromUser(user: NameSource | null | undefined): string | null {
  const meta = user?.user_metadata ?? {};
  const full =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.given_name === "string" && meta.given_name) ||
    "";
  const first = full.trim().split(/\s+/)[0];
  if (first) return first;
  const email = user?.email?.trim();
  if (email?.includes("@")) return email.split("@")[0] ?? null;
  return null;
}
