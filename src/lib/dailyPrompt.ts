/**
 * In-app daily founder prompt. Keep this list aligned with
 * supabase/functions/send-daily-prompt — the push and the desk should ask
 * the same question on a given UTC day.
 */
export const DAILY_PROMPTS = [
  "What's the one decision today that, if you got it right, would matter most this quarter?",
  "Which customer conversation would teach you the most this week? Book it.",
  "Name the biggest risk you're not currently tracking. Add it to your top-of-mind list.",
  "Where are you the bottleneck? Delegate one thing today.",
  "What would you do this week if you had 10x more conviction?",
  "Identify a feature you can cut. Ship the smaller thing faster.",
  "Who on your team is underused? Give them a stretch assignment.",
  "What metric have you been avoiding? Look at it now.",
  "Write the one-sentence version of your strategy. Read it tomorrow.",
  "Which meeting on your calendar this week is optional? Cancel it.",
] as const;

export function todaysPrompt(now = Date.now()): string {
  const dayIndex = Math.floor(now / (1000 * 60 * 60 * 24));
  return DAILY_PROMPTS[dayIndex % DAILY_PROMPTS.length];
}
