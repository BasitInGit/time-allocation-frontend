export const GAP_RULES = {
  morning: [
    { min: 0, max: 2, gap: 0 },
    { min: 2, max: 3, gap: 0.5 },
    { min: 3, max: 4, gap: 1 },
    { min: 4, max: Infinity, gap: 1 },
  ],

  afternoon: [
    { min: 0, max: 2, gap: 0 },
    { min: 2, max: 2.5, gap: 0.5 },
    { min: 2.5, max: 3, gap: 1 },
    { min: 3, max: 3.5, gap: 1.25 },
    { min: 3.5, max: Infinity, gap: 1.5 },
  ],

  evening: [
    { min: 0, max: 1.5, gap: 0 },
    { min: 1.5, max: 2, gap: 0.5 },
    { min: 2, max: 2.5, gap: 1 },
    { min: 2.5, max: Infinity, gap: 1.5 },
  ],
};
/**
 * Gap Rule Engine
 *
 * Determines rest/break duration based on accumulated workload
 * and time-of-day context.
 *
 * Purpose:
 * - Prevent continuous overloading
 * - Introduce natural breaks into schedule
 * - Adjust recovery time dynamically depending on fatigue level
 *
 * Output: gap duration in hours
 */
export function getGap(prevLoad, timeOfDay) {
  const rules = GAP_RULES[timeOfDay];

  for (const r of rules) {
    if (prevLoad >= r.min && prevLoad < r.max) {
      return r.gap;
    }
  }

  return 0;
}