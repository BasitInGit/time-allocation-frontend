/**
 * Task Library
 *
 * Defines available task templates grouped by:
 * - Category (Academic, Work, Health, Leisure)
 * - Intensity (Light, Balanced, Intense)
 *
 * Each task defines:
 * - Human-readable name
 * - Estimated duration
 *
 * Used by the scheduler to instantiate real scheduled blocks.
 */
export const TASK_LIBRARY = {
  Academic: {
  Light: [
      { name: "Review notes", duration: 0.5 },
      { name: "Flashcards", duration: 0.5 },
      { name: "Light practice questions", duration: 1 },
      { name: "Lecture recap", duration: 1 }
    ],

  Balanced: [
      { name: "Practice questions set", duration: 1 },
      { name: "Structured revision", duration: 1 },
      { name: "Timed practice set", duration: 1 },
      { name: "Exam-style questions", duration: 1 }
    ],

  Intense: [
      { name: "Focused problem block", duration: 1 },
      { name: "Timed questions set", duration: 1 },
      { name: "High difficulty revision", duration: 1.5 },
      { name: "Exam technique drill", duration: 1.5 }
    ]
  },

  Work: {
  Light: [
      { name: "Inbox check", duration: 0.5 },
      { name: "Small admin task", duration: 0.5 },
      { name: "Email cleanup", duration: 1 },
      { name: "Task review", duration: 1 }
    ],

  Balanced: [
      { name: "Email batch processing", duration: 1 },
      { name: "Task execution block", duration: 1 },
      { name: "Project task block", duration: 1 },
      { name: "Workflow execution sprint", duration: 1 }
    ],

  Intense:[
      { name: "Focused build", duration: 1 },
      { name: "Critical task block", duration: 1 },
      { name: "Deep development", duration: 1.5 },
      { name: "System design work", duration: 1.5 }
    ]
  },

 Health: {
  Light:[
      { name: "Stretch", duration: 0.5 },
      { name: "Walk", duration: 0.5 },
      { name: "Light yoga", duration: 1 },
      { name: "Mobility session", duration: 1 }
    ],

  Balanced:[
      { name: "Workout session", duration: 1 },
      { name: "Cardio session", duration: 1 },
      { name: "Strength training", duration: 1 },
      { name: "Mobility and core session", duration: 1 }
    ],

  Intense: [
      { name: "HIIT session", duration: 1 },
      { name: "Hard cardio", duration: 1 },
      { name: "High intensity workout", duration: 1.5 },
      { name: "Athletic training", duration: 1.5 }
    ]
  },

  Leisure: {
  Light:[
      { name: "Music break", duration: 0.5 },
      { name: "Rest", duration: 0.5 },
      { name: "Short unwind", duration: 1 },
      { name: "Tea break", duration: 1 }
    ],

  Balanced: [
      { name: "Hobby session", duration: 1 },
      { name: "Social catch-up", duration: 1 },
      { name: "Watch an episode", duration: 0.5 },
      { name: "Phone break", duration: 0.5 },
    ],

  Intense: [
      { name: "Focused leisure", duration: 1 },
      { name: "Deep hobby work", duration: 1 },
      { name: "Extended hobby session", duration: 1.5 },
      { name: "Creative work", duration: 1.5 }
    ]
  }
};
/**
 * Task Selection Engine
 *
 * Selects a concrete task from the task library based on:
 * - Category + intensity
 * - Available time slot duration
 * - Last executed task (prevents repetition)
 *
 * Behavior:
 * - Filters tasks that fit within remaining time
 * - Avoids repeating the same task consecutively
 * - Randomly selects from valid candidates for variation
 */
export function pickTask({
  category,
  intensity,
  slotDuration,
  taskLibrary,
  lastTaskName,
}) {
  const pool = taskLibrary?.[category]?.[intensity] || [];
console.log("POOL :", pool);
  if (!pool.length) return null;

  // 1. get all tasks that fit the slot (within tolerance if needed)
  let candidates = pool.filter(t => t.duration <= slotDuration);

  // 2. avoid repetition (soft penalty)
  let filtered = candidates.filter(t => t.name !== lastTaskName);

  if (!filtered.length) {
    filtered = candidates;
  }

  // 4. pick weighted random (or just first for simplicity)
  if (!filtered.length) return null;
  const choice =
    filtered[Math.floor(Math.random() * filtered.length)];

  return choice;

}