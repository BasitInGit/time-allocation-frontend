import { getTasksForWeek } from "./dateUtils";

export function getActualWeeklyDistribution(tasks, date = new Date()) {
  const weeklyTasks = getTasksForWeek(tasks, date);

  const categoryMap = {};

  weeklyTasks.forEach(task => {
    const cat = task.category;
    const hours = Number(task.duration) || 0;

    categoryMap[cat] = (categoryMap[cat] || 0) + hours;
  });

  const total = Object.values(categoryMap).reduce((a, b) => a + b, 0);

  if (total === 0) return [];

  return Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value: (value / total) * 100,
  }));
}


export function getActualWeeklyDistribution2(tasks, date) {
  if (!date) return [];

  const weeklyTasks = getTasksForWeek(tasks, date);

  const categoryMap = {};

  weeklyTasks.forEach(task => {
    const cat = task.category;
    const hours = Number(task.duration) || 0;

    categoryMap[cat] = (categoryMap[cat] || 0) + hours;
  });

  const total = Object.values(categoryMap).reduce((a, b) => a + b, 0);

  if (total === 0) return [];

  return Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value, 
  }));
}