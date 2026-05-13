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