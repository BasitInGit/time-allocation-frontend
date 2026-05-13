import { createContext, useContext, useState, useEffect } from "react";
import { getActualWeeklyDistribution } from "../utils/analytics";
import { getWeekRangeLabel, buildDateTime, getTasksForWeek } from "../utils/dateUtils";
import { timeToMinutesSafe } from "../utils/Scheduler/timeUtils";
import {
  fetchTasks,
  createTask,
  updateTaskApi,
  deleteTaskApi,
} from "../assets/api/tasks";
import {
  fetchReminders,
  createReminder,
  updateReminderApi,
  deleteReminderApi,
} from "../assets/api/reminders";
import {
  fetchDeadlines,
  createDeadline,
  updateDeadlineApi,
  deleteDeadlineApi,
} from "../assets/api/deadlines";

import {
  fetchTimeDistribution,
  saveTimeDistribution,
} from "../assets/api/timeDistribution";

const AppContext = createContext();

const defaultTask = {
  id: "",
  title: "",
  category: "Academic",
  date: "",
  time: "",
  duration: "",
  details: "",
  color: "bg-gray-500",
  generated: false,
};

const defaultReminder = {
  id: "",
  taskId: "",
  reminderDate: "",
  reminderTime: "",
  frequency: "once",
};

const DEFAULT_DISTRIBUTION = [
  { name: "Academic", value: 25 },
  { name: "Work", value: 25 },
  { name: "Health", value: 25 },
  { name: "Leisure", value: 25 },
];

const DEFAULT_PREFERENCES = [
  {
    name: "Academic",
    preferredTime: "morning",
    intensity: "high",
  },
  {
    name: "Work",
    preferredTime: "afternoon",
    intensity: "medium",
  },
  {
    name: "Health",
    preferredTime: "morning",
    intensity: "medium",
  },
  {
    name: "Leisure",
    preferredTime: "evening",
    intensity: "low",
  },
];

export function AppProvider({ children }) {
  // GLOBAL STATE

  const [tasks, setTasks] = useState([]);
  const [timeDistribution, setTimeDistribution] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [schedulePreferences, setSchedulePreferences] = useState([]);

  //  Add task
const addTask = async (task) => {
  const newTask = {
    ...defaultTask,
    ...task,
    id: crypto.randomUUID(),
  };

  try {
    await createTask(newTask);

    setTasks(prev => [...prev, newTask]);
  } catch (err) {
    console.error(err);
  }
};

//  Delete task
const deleteTask = async (id) => {
  try {
    await deleteTaskApi(id);

    setTasks(prev =>
      prev.filter(task => task.id !== id)
    );
  } catch (err) {
    console.error(err);
  }
};

const updateTask = async (updatedTask) => {
   try {
    await updateTaskApi(updatedTask);

    setTasks(prev =>
      prev.map(task =>
        task.id === updatedTask.id
          ? updatedTask
          : task
      )
    );
  } catch (err) {
    console.error(err);
  }
};

const addReminder = async (reminder) => {
  const newReminder = {
    ...defaultReminder,
    ...reminder,
    id: crypto.randomUUID(),
  };

  try {
    await createReminder(newReminder);

    setReminders(prev => [
      ...prev,
      newReminder,
    ]);
  } catch (err) {
    console.error(err);
  }
};

const updateReminder = async (updatedReminder) => {
  try {
    await updateReminderApi(updatedReminder);

    setReminders(prev =>
      prev.map(reminder =>
        reminder.id === updatedReminder.id
          ? updatedReminder
          : reminder
      )
    );
  } catch (err) {
    console.error(err);
  }
};

const deleteReminder = async (id) => {
  try {
    await deleteReminderApi(id);

    setReminders(prev =>
      prev.filter(r => r.id !== id)
    );
  } catch (err) {
    console.error(err);
  }
};

const addDeadline = async (deadline) => {
  const newDeadline = {
    ...deadline,
    id: crypto.randomUUID(),
  };

  try {
    await createDeadline(newDeadline);

    setDeadlines(prev => [
      ...prev,
      newDeadline,
    ]);
  } catch (err) {
    console.error(err);
  }
};

const updateDeadline = async (
  updatedDeadline
) => {
  try {
    await updateDeadlineApi(updatedDeadline);

    setDeadlines(prev =>
      prev.map(deadline =>
        deadline.id === updatedDeadline.id
          ? updatedDeadline
          : deadline
      )
    );
  } catch (err) {
    console.error(err);
  }
};

const deleteDeadline = async (id) => {
  try {
    await deleteDeadlineApi(id);

    setDeadlines(prev =>
      prev.filter(d => d.id !== id)
    );
  } catch (err) {
    console.error(err);
  }
};

const updateTimeDistribution = async (newDistribution) => {
  try {
    await saveTimeDistribution(newDistribution);

    setTimeDistribution(newDistribution);
  } catch (err) {
    console.error(err);
  }
};

const sortTasksByTime = (taskList) =>
  [...taskList].sort(
    (a, b) =>
      timeToMinutesSafe(a.time) - timeToMinutesSafe(b.time)
  );

const getUpcomingTasks = () => {
  const now = new Date();

  return tasks
    .filter(task => task.time && task.date)
    .filter(task => {
      const taskDateTime = buildDateTime(task.date, task.time);
      return taskDateTime && taskDateTime >= now; // only future tasks
    })
    .sort((a, b) => {
      return buildDateTime(a.date, a.time) - buildDateTime(b.date, b.time);
    })
    .slice(0, 3); // first 3 upcoming
};

const getReminderTasks = () => {
  const now = new Date();

  return reminders
    .map(rem => {
      const task = tasks.find(t => t.id === rem.taskId);
      const reminderDateTime = buildDateTime(rem.reminderDate, rem.reminderTime);

      return {
        ...rem,
        task,
        reminderDateTime,
      };
    })
    .filter(r => r.task && r.reminderDateTime >= now)
    .sort((a, b) => a.reminderDateTime - b.reminderDateTime)
    .slice(0, 3);
};


const getWeeklyActualDistribution = () => {
  const weeklyTasks = getTasksForWeek(tasks);
  return getActualWeeklyDistribution(weeklyTasks);
};

const weekLabel = getWeekRangeLabel(new Date());

  // LOAD DATA
 useEffect(() => {
  async function loadAll() {
    const [t, r, d, dist] = await Promise.all([
      fetchTasks(),
      fetchReminders(),
      fetchDeadlines(),
      fetchTimeDistribution(),
    ]);

    setTasks(t);
    setReminders(r);
    setDeadlines(d);

    setTimeDistribution(
      dist?.length ? dist : DEFAULT_DISTRIBUTION
    );
  }

  loadAll();
}, []);


  useEffect(() => {
    const savedPrefs = JSON.parse(localStorage.getItem("schedulePreferences"));

    setSchedulePreferences(
      savedPrefs?.length ? savedPrefs : DEFAULT_PREFERENCES
    );
  }, []);

  // SAVE DATA
  useEffect(() => {
    localStorage.setItem(
      "schedulePreferences",
      JSON.stringify(schedulePreferences)
    );
  }, [schedulePreferences]);


  return (
    <AppContext.Provider
      value={{
        tasks,
        setTasks,
        defaultTask,
        addTask,
        deleteTask,
        updateTask,

        getUpcomingTasks,
        getReminderTasks,
        getWeeklyActualDistribution,
        weekLabel,

        deadlines,
        setDeadlines,
        addDeadline,
        updateDeadline,
        deleteDeadline,
        timeDistribution,
        updateTimeDistribution,
        reminders,
        setReminders,
        defaultReminder,
        addReminder,
        updateReminder,
        deleteReminder,
        schedulePreferences,
        setSchedulePreferences,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// Custom hook
export function useAppContext() {
  return useContext(AppContext);
}