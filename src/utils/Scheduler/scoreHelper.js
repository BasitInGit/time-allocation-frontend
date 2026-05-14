/**
 * Scoring System (Category + Intensity)
 *
 * Converts scheduling constraints into numeric scores used for decision-making.
 *
 * Category scoring:
 * - Encourages balanced distribution of workload
 * - Penalizes repetition and rigid sequences
 * - Applies time-of-day preference matching
 * - Controls special constraints (e.g., Health load limits)
 *
 * Intensity scoring:
 * - Matches user preference intensity (low/medium/high)
 * - Adjusts for fatigue (prevLoad)
 * - Aligns with category analysis recommendations
 * - Penalizes oversized tasks in small time slots
 */

export const SCORES = {
  leisure: {
    firstTask: -10,
    afterGap: -10
  },

  timePreference: {
    match: 4,
    mismatch: -2,
    neutral: 2
  },

  repetition: {
    sameCategory: -4,
    academicWorkLoop: -4
  },

  health: {
    softPenalty: -4,
    hardPenalty: -1000
  },

  slotFit: {
    lowInShortSlot: 4,
    mediumInShortSlot: -1000,
    highInShortSlot: -1000
  },

  intensityPreference: {
    exactMatch: 3
  },

  analysis: {
    intenseMatch: 2.5,
    balancedMatch: 2.5,
    lightMatch: 2.5
  },

  fatigue: {
    highAfterHeavy: -3,
    highAfterMedium: -1.5,
    mediumAfterHeavy: -1
  },

  remainingLoad: {
    highIntensityWhenLotsRemaining: 1.5,
    highIntensityNearCompletion: -2,
    mediumIntensityWhenBehind: 0.5
  },

  distribution: {
    pressureMultiplier: 1.2,
    pressureCap: 3
  }
};

export function scoreCategory({
  category,
  categoryState,
  preferences,
  lastCategory,
  awBuffer,
  timeOfDay,
  distribution,
  isFirstTask,
  healthLoad,
  justHadGap
}) {
  let score = 0;

  const pref =
    preferences.find(p => p.name === category);

  // =========================
  // LEISURE PENALTIES
  // =========================

  if (
    isFirstTask &&
    category === "Leisure"
  ) {
    score += SCORES.leisure.firstTask;
  }

  if (
    justHadGap &&
    category === "Leisure"
  ) {
    score += SCORES.leisure.afterGap;
  }

  // =========================
  // TIME PREFERENCE
  // =========================

  if (pref) {

    if (pref.preferredTime === timeOfDay) {
      score += SCORES.timePreference.match;
    }

    else if (pref.preferredTime !== "any") {
      score += SCORES.timePreference.mismatch;
    }

    else {
      score += SCORES.timePreference.neutral;
    }
  }

  // =========================
  // ACADEMIC / WORK LOOP
  // =========================

  const safeAwBuffer =
    Array.isArray(awBuffer)
      ? awBuffer
      : [];

  const isRecentAcademicWork =
    safeAwBuffer.length === 2 &&
    (
      (
        safeAwBuffer[0] === "Academic" &&
        safeAwBuffer[1] === "Work"
      ) ||
      (
        safeAwBuffer[0] === "Work" &&
        safeAwBuffer[1] === "Academic"
      )
    );

  if (
    isRecentAcademicWork &&
    (
      category === "Academic" ||
      category === "Work"
    )
  ) {
    score += SCORES.repetition.academicWorkLoop;
  }

  // =========================
  // SAME CATEGORY REPETITION
  // =========================

  if (category === lastCategory) {
    score += SCORES.repetition.sameCategory;
  }

  // =========================
  // HEALTH LOAD
  // =========================

  const state =
    categoryState?.[category];

  if (category === "Health") {

    if (healthLoad >= 2) {
      state.targetHours = state.usedHours;

      return SCORES.health.hardPenalty;
    }

    else if (healthLoad >= 1.5) {
      score += SCORES.health.softPenalty;
    }
  }

  // =========================
  // DISTRIBUTION PRESSURE
  // =========================

  const delta =
    state.targetHours - state.usedHours;

  const pressure =
    Math.max(0, delta);

  score += Math.min(
    SCORES.distribution.pressureCap,
    pressure *
    SCORES.distribution.pressureMultiplier
  );

  return score;
}

export function scoreIntensity({
  category,
  categoryState,
  intensity,
  prevLoad,
  preferences,
  categoryAnalysis,
  slotDuration
}) {
  let score = 0;

  const pref =
    preferences.find(p => p.name === category);

  const base =
    pref?.intensity || "medium";

  const analysis =
    categoryAnalysis?.[category];

  // =========================
  // SLOT FIT
  // =========================

  if (slotDuration <= 0.5) {

    if (intensity === "low") {
      score += SCORES.slotFit.lowInShortSlot;
    }

    if (intensity === "medium") {
      return SCORES.slotFit.mediumInShortSlot;
    }

    if (intensity === "high") {
      return SCORES.slotFit.highInShortSlot;
    }
  }

  // =========================
  // USER INTENSITY PREFERENCE
  // =========================

  if (intensity === base) {
    score += SCORES.intensityPreference.exactMatch;
  }

  // =========================
  // ANALYSIS SIGNAL
  // =========================

  if (analysis?.recommendedIntensity) {

    if (
      analysis.recommendedIntensity === "Intense" &&
      intensity === "high"
    ) {
      score += SCORES.analysis.intenseMatch;
    }

    if (
      analysis.recommendedIntensity === "Balanced" &&
      intensity === "medium"
    ) {
      score += SCORES.analysis.balancedMatch;
    }

    if (
      analysis.recommendedIntensity === "Light" &&
      intensity === "low"
    ) {
      score += SCORES.analysis.lightMatch;
    }
  }

  // =========================
  // FATIGUE PENALTIES
  // =========================

  if (
    prevLoad >= 3 &&
    intensity === "high"
  ) {
    score += SCORES.fatigue.highAfterHeavy;
  }

  if (
    prevLoad >= 2 &&
    intensity === "high"
  ) {
    score += SCORES.fatigue.highAfterMedium;
  }

  if (
    prevLoad >= 3 &&
    intensity === "medium"
  ) {
    score += SCORES.fatigue.mediumAfterHeavy;
  }

  // =========================
  // REMAINING LOAD LOGIC
  // =========================

  const state =
    categoryState?.[category];

  if (state) {

    const remaining =
      state.targetHours - state.usedHours;

    const safeRemaining =
      Math.max(0, remaining);

    // reward high intensity when far behind
    if (
      safeRemaining > 3 &&
      intensity === "high"
    ) {
      score +=
        SCORES.remainingLoad
          .highIntensityWhenLotsRemaining;
    }

    // discourage high intensity near completion
    if (
      safeRemaining < 2 &&
      intensity === "high"
    ) {
      score +=
        SCORES.remainingLoad
          .highIntensityNearCompletion;
    }

    // encourage medium intensity when behind
    if (
      safeRemaining > 4 &&
      intensity === "medium"
    ) {
      score +=
        SCORES.remainingLoad
          .mediumIntensityWhenBehind;
    }
  }

  return score;
}