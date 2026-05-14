/**
 * Candidate Selection Engine
 *
 * Chooses the best (category + intensity) pair for the next task slot.
 *
 * Decision is based on:
 * - Category pressure (remaining workload vs target)
 * - User preferences (time-of-day + intensity)
 * - Fatigue and recent workload patterns
 * - Anti-repetition rules (awBuffer, lastCategory)
 * - Special constraints (health load, gap recovery)
 *
 * It evaluates all combinations and returns the highest-scoring candidate.
 */
import { scoreCategory, scoreIntensity } from "./scoreHelper";

export function pickCandidate({
  categories,
  categoryState,
  lastCategory,
  awBuffer,
  timeOfDay,
  preferences,
  prevLoad,
  categoryAnalysis,
  isFirstTask,
  slotDuration,
  healthLoad,
  justHadGap
}) {

  const intensities = ["low", "medium", "high"];

  let best = null;
  let bestScore = -Infinity;
  

  for (const category of categories) {

    const categoryScore = scoreCategory({
      category,
      categoryState,
      preferences,
      lastCategory,
      awBuffer,
      timeOfDay,
      isFirstTask,
      healthLoad,
      justHadGap
    });

    for (const intensity of intensities) {

      const intensityScore = scoreIntensity({
        category,
        categoryState,
        intensity,
        prevLoad,
        preferences,
        categoryAnalysis,
        slotDuration
      });

      const combinedScore =
        categoryScore +
        intensityScore;

      if (combinedScore > bestScore) {

        bestScore = combinedScore;

        best = {
          category,
          intensity,
        };
      }
    }
  }

  return best;
}