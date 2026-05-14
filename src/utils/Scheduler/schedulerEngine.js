/**
 * Scheduler Engine
 *
 * Core system that generates a time-based task schedule for a given day.
 *
 * It works by:
 * - Building a timeline of fixed (existing tasks) and free blocks
 * - Calculating available free time
 * - Distributing workload across categories based on:
 *   - User preferences
 *   - Target distribution (pressure system)
 *   - Fatigue and gap rules
 *   - Time-of-day context
 *
 * The engine then:
 * - Selects categories via scoring heuristics (pickCandidate)
 * - Selects specific tasks from a task library (pickTask)
 * - Applies pacing rules (gaps, load limits, repetition control)
 *
 * Output: ordered list of scheduled tasks with timestamps
 */

import { toHours, toTimeStr } from "./timeUtils";
import { buildTimelineBlocks } from "./timelineBuilder";
import { getGap } from "./gapHelper";
import { pickCandidate } from "./pickHelper";
import { pickTask, TASK_LIBRARY } from "./taskPicker";
import { normalizeDate } from "../dateUtils";

// =========================
// HELPERS
// =========================

/**
 * Academic + Work are grouped together
 * for repetition/fatigue analysis.
 */
const isAcademicWorkCategory = (category) =>
  category === "Academic" ||
  category === "Work";

/**
 * Health tasks are tracked separately
 * to avoid overloading physical effort.
 */
const isHealthCategory = (category) =>
  category === "Health";

/**
 * Converts hour value into broad
 * scheduling context buckets.
 */
const getTimeOfDay = (hour) => {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

/**
 * Prevents oversized tasks from being
 * evaluated for small remaining slots.
 */
const getSlotDuration = (remaining) =>
  Math.min(1.5, remaining);

/**
 * Determines when workload fatigue
 * should trigger a recovery gap.
 */
const shouldInsertGap = (
  prevLoad,
  loadMax
) => prevLoad >= loadMax;

/**
 * Maintains a rolling Academic/Work buffer
 * used to detect repetitive mental workload.
 *
 * Example:
 * ["Academic", "Work"]
 */
const updateAwBuffer = (
  awBuffer,
  category
) => {

  if (isAcademicWorkCategory(category)) {

    const next = [
      ...awBuffer,
      category
    ];

    // Keep only the last 2 entries
    return next.slice(-2);
  }

  // Reset buffer when switching away
  return [];
};

/**
 * Maps internal low/medium/high intensity
 * values to task-library intensity labels.
 */
const mapIntensity = (
  category,
  val
) => {

  // Leisure is intentionally normalized
  if (category === "Leisure") {
    return "Balanced";
  }

  if (val === "low") {
    return "Light";
  }

  if (val === "medium") {
    return "Balanced";
  }

  if (val === "high") {
    return "Intense";
  }

  return "Balanced";
};

// =========================
// ENGINE
// =========================

export function generateSchedule({
  date,
  startTime,
  endTime,
  distribution = [],
  preferences = [],
  categoryAnalysis = [],
  existingTasks = [],
}) {

  const cleanDate =
    normalizeDate(date);

  const start =
    toHours(startTime);

  const end =
    toHours(endTime);

  // =========================
  // BUILD TIMELINE
  // =========================

  /**
   * Creates:
   * - fixed blocks (existing tasks)
   * - free blocks (available scheduling space)
   *
   * Timeline is clamped to scheduler bounds.
   */
  const baseTimeline =
    buildTimelineBlocks({
      date,
      startTime,
      endTime,
      existingTasks,
    })
    .map(block => ({
      ...block,
      start: Math.max(block.start, start),
      end: Math.min(block.end, end),
    }))
    .filter(block => block.end > block.start);

  // =========================
  // TOTAL FREE HOURS
  // =========================

  /**
   * Total schedulable time used for
   * workload distribution pressure.
   */
  const totalFreeHours =
    baseTimeline.reduce((sum, block) => {

      if (block.type === "free") {
        return sum + (
          block.end - block.start
        );
      }

      return sum;

    }, 0);

  // =========================
  // CATEGORY STATE
  // =========================

  /**
   * Tracks:
   * - targetHours (desired workload)
   * - usedHours (scheduled workload)
   */
  const categoryState = {};

  /**
   * Falls back to equal distribution
   * if no explicit distribution exists.
   */
  const activeDistribution =
    Array.isArray(distribution) &&
    distribution.length > 0

      ? distribution

      : preferences.map(p => ({
          category: p.name,
          pressure: 1 / preferences.length,
        }));

  for (const d of activeDistribution) {

    categoryState[d.category] = {
      targetHours:
        d.pressure * totalFreeHours,

      usedHours: 0,
    };
  }

  // =========================
  // RUNTIME STATE
  // =========================

  /**
   * Runtime scheduling memory/state.
   * Mutates throughout generation.
   */

  let loadMax = 2;

  let lastCategory = null;

  let awBuffer = [];

  let lastTaskName = null;

  let healthLoad = 0;

  let prevLoad = 0;

  let gap = 0;

  let justHadGap = false;

  const scheduled = [];

  // =========================
  // TIMELINE LOOP
  // =========================

  for (const block of baseTimeline) {

    const duration =
      block.end - block.start;

    // =========================
    // FIXED BLOCK
    // =========================

    /**
     * Existing tasks contribute
     * to workload fatigue.
     */
    if (block.type === "fixed") {

      prevLoad += duration;

      // Apply recovery gap after sustained workload
      if (
        shouldInsertGap(
          prevLoad,
          loadMax
        )
      ) {

        const projectedCursor =
          block.start + prevLoad;

        const timeOfDay =
          getTimeOfDay(projectedCursor);

        gap = getGap(
          prevLoad,
          timeOfDay
        );

        prevLoad = 0;
      }

      continue;
    }

    // =========================
    // FREE BLOCK
    // =========================

    /**
     * Gap carries into the next
     * free block if fatigue triggered.
     */
    if (gap > 0) {
      justHadGap = true;
    }

    let remaining =
      duration - gap;

    // Round to nearest 30min block
    remaining =
      Math.floor(remaining * 2) / 2;

    let cursor =
      block.start + gap;

    gap = 0;

    const categories =
      preferences.map(p => p.name);

    // =========================
    // TASK FILL LOOP
    // =========================

    while (remaining > 0) {

      const timeOfDay =
        getTimeOfDay(cursor);

      const isFirstTask =
        scheduled.length === 0;

      const slotDuration =
        getSlotDuration(remaining);

      // =========================
      // PICK CATEGORY + INTENSITY
      // =========================

      /**
       * Candidate scoring considers:
       * - distribution pressure
       * - fatigue
       * - repetition
       * - time preference
       * - slot sizing
       */
      const candidate =
        pickCandidate({
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
        });

      if (!candidate) {
        break;
      }

      const {
        category,
        intensity
      } = candidate;

      // =========================
      // UPDATE AW BUFFER
      // =========================

      awBuffer =
        updateAwBuffer(
          awBuffer,
          category
        );

      // =========================
      // TASK SELECTION
      // =========================

      const intensityKey =
        mapIntensity(
          category,
          intensity
        );

      /**
       * Selects a concrete task from the
       * task library matching:
       * - category
       * - intensity
       * - slot duration
       */
      const task =
        pickTask({
          category,
          intensity: intensityKey,
          slotDuration,
          taskLibrary: TASK_LIBRARY,
          lastTaskName,
        });

      if (!task) {
        break;
      }

      // =========================
      // SCHEDULE TASK
      // =========================

      scheduled.push({
        ...task,
        category,
        start: cursor,
        end: cursor + task.duration,
      });

      // =========================
      // UPDATE RUNTIME STATE
      // =========================

      justHadGap = false;

      lastCategory = category;

      lastTaskName = task.name;

      cursor += task.duration;

      remaining -= task.duration;

      prevLoad += task.duration;

      categoryState[
        category
      ].usedHours += task.duration;

      // =========================
      // HEALTH TRACKING
      // =========================

      if (
        isHealthCategory(category)
      ) {
        healthLoad += task.duration;
      }

      // =========================
      // FATIGUE RECOVERY GAP
      // =========================

      /**
       * Inserts recovery periods after
       * sustained workload accumulation.
       */
      if (
        shouldInsertGap(
          prevLoad,
          loadMax
        )
      ) {

        gap = getGap(
          prevLoad,
          timeOfDay
        );

        prevLoad = 0;

        cursor += gap;

        remaining -= gap;

        justHadGap = true;
      }
    }
  }

  return scheduled;
}