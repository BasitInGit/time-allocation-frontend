import { toHours, toTimeStr } from "./timeUtils";
import { buildTimelineBlocks } from "./timelineBuilder";
import { getGap } from "./gapHelper";
import { pickCandidate } from "./pickHelper";
import { pickTask, TASK_LIBRARY } from "./taskPicker";
import { normalizeDate } from "../dateUtils";

const mapIntensity = (category,val) => {
  if (category === "Leisure") return "Balanced"; 
  if (val === "low") return "Light";
  if (val === "medium") return "Balanced";
  if (val === "high") return "Intense";
  return "Balanced";
};

export function generateSchedule({
  date,
  startTime,
  endTime,
  distribution = [],
  preferences = [],
  categoryAnalysis = [],
  existingTasks = [],
}) {

  const cleanDate = normalizeDate(date);

  const start = toHours(startTime);
  const end = toHours(endTime);

  const baseTimeline = buildTimelineBlocks({
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

  const totalFreeHours =
    baseTimeline.reduce((sum, block) => {
      if (block.type === "free") {
        return sum + (block.end - block.start);
      }
      return sum;
    }, 0);

  const categoryState = {};

  const activeDistribution =
    Array.isArray(distribution) && distribution.length > 0
      ? distribution
      : preferences.map(p => ({
          category: p.name,
          pressure: 1 / preferences.length,
        }));

  for (const d of activeDistribution) {
    categoryState[d.category] = {
      targetHours: d.pressure * totalFreeHours,
      usedHours: 0,
    };
  }

  let loadMax = 2;
  let lastCategory = null;
  let awBuffer = [];
  let lastTaskName = null;
  let healthLoad = 0;
  let prevLoad = 0;
  let gap = 0;
  let justHadGap = false;

  const scheduled = [];

for (const block of baseTimeline) {

  const duration = block.end - block.start;

  // FIXED BLOCK
  if (block.type === "fixed") {

    prevLoad += duration;

    if (prevLoad >= loadMax) {

      const projectedCursor = block.start + prevLoad;

      const timeOfDay =
        projectedCursor < 12 ? "morning" :
        projectedCursor < 17 ? "afternoon" :
        "evening";
        
      gap = getGap(prevLoad, timeOfDay);
      prevLoad = 0;
    }

    continue;
  }

  // FREE BLOCK
  if (gap > 0){
    justHadGap = true;
  }
  let remaining = duration - gap;
  remaining = Math.floor(remaining * 2) / 2;
  let cursor = block.start + gap;

  gap = 0;

  const categories = preferences.map(p => p.name);

  while (remaining > 0) {

    const timeOfDay =
      cursor < 12 ? "morning" :
      cursor < 17 ? "afternoon" :
      "evening";

    const isFirstTask = scheduled.length === 0;

    const candidate = pickCandidate({
      categories,
      categoryState,
      lastCategory,
      awBuffer,
      timeOfDay,
      preferences,
      prevLoad,
      categoryAnalysis,
      isFirstTask,
      slotDuration: Math.min(1.5, remaining),
      healthLoad, 
      justHadGap
    });

    if (!candidate) break;

    const { category, intensity } = candidate;

    if (category === "Academic" || category === "Work") {
      awBuffer.push(category);
      if (awBuffer.length > 2) {
        awBuffer.shift();
      }
    } else {
      awBuffer = [];
    }
    console.log("AW BUFFER:", awBuffer);

    const intensityKey = mapIntensity(category,intensity);

    const task = pickTask({
      category,
      intensity:intensityKey,
      slotDuration: Math.min(1.5, remaining),
      taskLibrary: TASK_LIBRARY,
      lastTaskName,
    });
    
    if (!task) break;

    scheduled.push({
      ...task,
      category,
      start: cursor,
      end: cursor + task.duration,
    });

    justHadGap = false;
    lastCategory = category
    lastTaskName = task.name;
    cursor += task.duration;
    remaining -= task.duration;
    prevLoad += task.duration;
    categoryState[category].usedHours += task.duration;

    if (category === "Health") {
      healthLoad += task.duration;
    }

    if (prevLoad >= loadMax) {
      gap = getGap(prevLoad, timeOfDay);
      prevLoad = 0;
      cursor += gap;
      remaining -= gap;
      justHadGap = true;
    }
    
  }
}
return scheduled

}







