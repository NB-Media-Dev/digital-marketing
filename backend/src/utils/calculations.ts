/**
 * Central business calculations. Every ratio guards a zero denominator so the
 * API never returns NaN / Infinity / undefined.
 */
export function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Percentage numerator/denominator (0 when denom is 0). */
export function pct(numerator: number, denominator: number, dp = 1): number {
  if (!denominator || denominator <= 0) return 0;
  return round((numerator / denominator) * 100, dp);
}

/** Plain ratio (0 when denom is 0). */
export function ratio(numerator: number, denominator: number, dp = 2): number {
  if (!denominator || denominator <= 0) return 0;
  return round(numerator / denominator, dp);
}

export const cpl = (spend: number, leads: number): number => ratio(spend, leads, 2);
export const qualifiedRate = (qualified: number, leads: number): number => pct(qualified, leads);
export const notInterestedRatio = (notInterested: number, contacted: number): number =>
  pct(notInterested, contacted);
export const conversionRate = (conversions: number, leads: number): number => pct(conversions, leads);
export const qualifiedConversionRate = (conversions: number, qualified: number): number =>
  pct(conversions, qualified);
export const completionRate = (completed: number, assigned: number): number => pct(completed, assigned);
export const onTimeRate = (onTime: number, completed: number): number => pct(onTime, completed);

/** % change from previous → current (0 when previous is 0). */
export function change(previous: number, current: number): number {
  if (!previous) return 0;
  return round(((current - previous) / previous) * 100, 1);
}

export const toNum = (v: unknown): number => (v == null ? 0 : Number(v));
