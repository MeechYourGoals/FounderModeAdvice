/**
 * Industry categories used by business/startup profiles.
 * The selected value is stored verbatim in `user_startup_profiles.industry`
 * (a free-text column), so a custom "Other" value is also valid.
 *
 * The chosen industry is passed into the AI analysis + chat context so output
 * adapts its language, examples, KPIs, risks, and recommendations to the
 * user's actual business — not a one-size-fits-all venture-backed tech startup.
 */
export const INDUSTRY_OPTIONS = [
  'Software / SaaS',
  'AI / Automation',
  'Retail / Ecommerce',
  'Food / Beverage / Hospitality',
  'Health / Wellness / Fitness',
  'Creator / Media / Entertainment',
  'Professional Services / Agency',
  'Real Estate / Construction / Local Services',
  'Hardware / Consumer Products',
  'Education / Coaching / Community',
] as const;

export const OTHER_INDUSTRY = 'Other';

/** True when a stored industry value is a custom ("Other") entry. */
export function isCustomIndustry(value: string | null | undefined): boolean {
  if (!value) return false;
  return !INDUSTRY_OPTIONS.includes(value as (typeof INDUSTRY_OPTIONS)[number]);
}
