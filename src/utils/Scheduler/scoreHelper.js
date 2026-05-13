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

  const pref = preferences.find(p => p.name === category);

  if (
    isFirstTask &&
    category === "Leisure"
  ) {
    score -= 10;
  }

  if (justHadGap && category === "Leisure") {
    score -= 10;
  }

  if (pref) {
    if (pref.preferredTime === timeOfDay) {
      score += 4;
    } else if (pref.preferredTime !== "any") {
      score -= 2;
    } else {
      score += 2;
    }
  }

  const safeAwBuffer = Array.isArray(awBuffer) ? awBuffer : [];

  const isRecentAcademicWork =
    safeAwBuffer.length === 2 &&
    (
    (safeAwBuffer[0] === "Academic" && safeAwBuffer[1] === "Work") ||
    (safeAwBuffer[0] === "Work" && safeAwBuffer[1] === "Academic")
  );

  if (isRecentAcademicWork && (category === "Academic" || category === "Work")) {
    score -= 4; 
  }

  if (category === lastCategory) {
    score -= 4;
  }
  
  const state = categoryState?.[category];


  if (category === "Health") {
    if (healthLoad >= 2) {
      state.targetHours = state.usedHours;
      return -1000;
    }
    else if (healthLoad >= 1.5) {
      score -= 4;
    }
  }


  const delta =
    state.targetHours - state.usedHours;

  const pressure = Math.max(0, delta);

  score += Math.min(3, pressure * 1.2);
  

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

  const pref = preferences.find(p => p.name === category);
  const base = pref?.intensity || "medium";
  const analysis = categoryAnalysis?.[category];

  // SLOT FIT BIAS
  if (slotDuration <= 0.5) {

    if (intensity === "low") {
      score += 4;
    }

    if (intensity === "medium") {
      return -1000;
    }

    if (intensity === "high") {
      return -1000;
    }
  }

  // =========================
  // USER PREFERENCE BIAS
  // =========================
  if (intensity === base) {
    score += 3;
  }

  // =========================
  // ANALYSIS SIGNAL
  // =========================
  if (analysis?.recommendedIntensity) {
    if (
      (analysis.recommendedIntensity === "Intense" && intensity === "high") ||
      (analysis.recommendedIntensity === "Balanced" && intensity === "medium") ||
      (analysis.recommendedIntensity === "Light" && intensity === "low")
    ) {
      score += 2.5;
    }
  }

  // =========================
  // FATIGUE PENALTIES
  // =========================
  if (prevLoad >= 3 && intensity === "high") {
    score -= 3;
  }

  if (prevLoad >= 2 && intensity === "high") {
    score -= 1.5;
  }

  if (prevLoad >= 3 && intensity === "medium") {
    score -= 1;
  }

  // =========================
  //  CATEGORY STATE INTEGRATION (NEW CORE LOGIC)
  // =========================
  const state = categoryState?.[category];

  if (state) {
    const remaining =
      state.targetHours - state.usedHours;

    const safeRemaining = Math.max(0, remaining);

    // intensity "cost profile"
    const intensityCost =
      intensity === "high" ? 1.5 :
      intensity === "medium" ? 1 :
      0.5;

    // reward using higher intensity when there is room left
    if (safeRemaining > 3 && intensity === "high") {
      score += 1.5;
    }

    // discourage high intensity when near completion
    if (safeRemaining < 2 && intensity === "high") {
      score -= 2;
    }

    // mild preference for efficient fill when behind schedule
    if (safeRemaining > 4 && intensity === "medium") {
      score += 0.5;
    }

  }

  return score;
}