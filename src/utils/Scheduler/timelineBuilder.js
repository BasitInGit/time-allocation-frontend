/**
 * Timeline Builder
 *
 * Converts a day into structured time blocks:
 * - Fixed blocks: existing tasks
 * - Free blocks: available scheduling windows
 *
 * Steps:
 * - Merge overlapping existing tasks
 * - Sort by time
 * - Split day into alternating free/fixed segments
 *
 * Output is used as the foundation for scheduling.
 */
import { toHours, toTimeStr } from "./timeUtils";
import { normalizeDate } from "../dateUtils";;


function mergeOverlappingTasks(existingTasks = []) {
  // 1. Convert tasks → time ranges
  const ranges = existingTasks
    .map(t => {
      const start = toHours(t.time);
      const duration = Number(t.duration || 1);
      const end = start + duration;

      if (start == null || isNaN(end)) return null;

      return { start, end };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  const merged = [];

  // 2. Merge overlapping ranges
  for (const range of ranges) {
    if (!merged.length) {
      merged.push(range);
      continue;
    }
    const last = merged[merged.length - 1];
    // overlap or touching
    if (range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push(range);
    }
  }
  return merged;
}
/**
 * Build free time blocks by removing existing tasks
 */
export function buildTimelineBlocks({
  startTime,
  endTime,
  existingTasks = [],
}) {
  const start = toHours(startTime);
  const end = toHours(endTime);

  const blocked = mergeOverlappingTasks(existingTasks);

  const blocks = [];
  let cursor = start;

  for (const b of blocked) {

    if (b.start > cursor) {
      blocks.push({
        start: cursor,
        end: b.start,
        type: "free",
      });
    }

    blocks.push({
      start: b.start,
      end: b.end,
      type: "fixed",
    });

    cursor = Math.max(cursor, b.end);
  }

  if (cursor < end) {
    blocks.push({
      start: cursor,
      end,
      type: "free",
    });
  }

  return blocks;
}
