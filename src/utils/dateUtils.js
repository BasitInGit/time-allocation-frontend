export const getWeekRange = (date = new Date()) => {
  const start = new Date(date);

  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};


export function getWeekRangeLabel(date = new Date()) {
  const start = new Date(date);

  const day = start.getDay(); 
  const diffToMonday = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const format = (d) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });

  return `${format(start)} – ${format(end)}`;
}

export function getTasksForWeek(tasks, date = new Date()) {
  const { start, end } = getWeekRange(date);

  return tasks.filter(task => {
    const d = parseLocalDate(task.date);
    return d >= start && d <= end;
  });
}
// ALWAYS returns local YYYY-MM-DD
export const getLocalDateStr = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000)
    .toISOString()
    .split("T")[0];
};

// Convert YYYY-MM-DD → LOCAL Date (safe)
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d); // 👈 LOCAL (this is key)
};

// Difference in days (SAFE)
export const diffDays = (dateA, dateB) => {
  const a = parseLocalDate(dateA);
  const b = parseLocalDate(dateB);

  const ms = a - b;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

// Normalize ANY date input → YYYY-MM-DD
export const normalizeDate = (date) => {
  if (!date) return null;

  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }

  return String(date).split("T")[0];
};

export const buildDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;

  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);

  if ([y, m, d, h, min].some(isNaN)) return null;

  return new Date(y, m - 1, d, h, min); // LOCAL SAFE
};