import { diffDays } from "../utils/dateUtils";

const ALL_CATEGORIES = ["Academic", "Health", "Leisure", "Work"];

export function analyzeDeadlineLoadByCategory(deadlines, selectedDate) {
  if (!selectedDate) return {};

  const categoryMap = {};

  deadlines.forEach(dl => {
    if (!dl.date || !dl.category) return;

    const daysLeft = diffDays(dl.date, selectedDate);
    const duration = Number(dl.duration || 0);

    const key = dl.category;

    if (!categoryMap[key]) {
      categoryMap[key] = { day1: 0, day2: 0, day3: 0, day5: 0 };
    }

    const cat = categoryMap[key];

    if (daysLeft <= 1) cat.day1 += duration;
    else if (daysLeft <= 2) cat.day2 += duration;
    else if (daysLeft <= 3) cat.day3 += duration;
    else if (daysLeft <= 5) cat.day5 += duration;
  });

  const results = {};

  ALL_CATEGORIES.forEach(category => {
    const data = categoryMap[category] || {
      day1: 0,
      day2: 0,
      day3: 0,
      day5: 0,
    };

    const total = data.day1 + data.day2 + data.day3 + data.day5;

    if (data.day1 > 8 || data.day2 > 15 || total > 20) {
      results[category] = {
        totalHours: total,
        recommendedIntensity: "Intense",
        warning: "High deadline pressure",
      };
    } else if (data.day1 > 5 || data.day2 > 10 || total > 12) {
      results[category] = {
        totalHours: total,
        recommendedIntensity: "Balanced",
        warning: "Moderate workload",
      };
    } else {
      results[category] = {
        totalHours: total,
        recommendedIntensity: "Light",
        warning: null,
      };
    }
  });

  return results;
}