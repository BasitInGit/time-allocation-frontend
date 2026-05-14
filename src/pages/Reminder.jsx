/**
 * Reminders Module
 * Handles creation, updating, deletion, and categorisation of reminders.
 * Includes data enrichment, date-based classification, and optimized lookup structures.
 */

import { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useParams } from "react-router-dom";
import { useRef } from "react";
import { normalizeDate, buildDateTime } from "../utils/dateUtils";
import { normalizeTime } from "../utils/Scheduler/timeUtils";

function Reminders() {
  const { tasks, reminders, addReminder, updateReminder, deleteReminder } = useAppContext();
  const { taskId } = useParams();
  const taskRefs = useRef({});

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);

  // Form state
  const [form, setForm] = useState({
    reminder: true,
    reminderDate: "",
    reminderTime: "",
    frequency: "once",
  });

  // Converts task array into a lookup map for O(1) access by taskId
  // improves performance when enriching reminders
  const taskMap = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      map[t.id] = t;
    }
    return map;
  }, [tasks]);

  useEffect(() => {
    if (taskId) {
      const found = tasks.find(t => t.id === taskId);
      if (found) {
        selectTask(found);
      }
    }
  }, [taskId]); 

  const selectTask = (item) => {
    if (!item) return;

    // If it's already a task
    let realTask = tasks.find(t => t.id === item.id);

    // If it's a reminder object
    if (!realTask && item.taskId) {
      realTask = tasks.find(t => t.id === item.taskId);
    }

    if (!realTask) return;

    setSelectedTask(realTask);

    setSelectedDate(realTask.date || "");

    const existing = reminders.find(
      r => r.taskId === realTask.id
    );

    setForm({
      reminderDate: existing?.reminderDate ?? "",
      reminderTime: existing?.reminderTime ?? "",
      frequency: existing?.frequency ?? "once",
    });
  };

  const [recentlySavedId, setRecentlySavedId] = useState(null);

  // Enriches reminder data by joining it with corresponding task information
  // to provide UI-ready display fields (title, date, etc.)
  const enrichedReminders = useMemo(() => {
    return reminders
      .map((r) => {
        const task = taskMap[r.taskId];

        if (!task) return null; 

        return {
          ...r,
          taskTitle: task.title,
          taskDate: task.date,
        };
      })
      .filter(Boolean);
  }, [reminders, taskMap]);

  // Handles both creation and updating of reminders depending on existence
  // of an existing reminder for the selected task
  const handleSave = async () => {
    if (!selectedTask) return;

    const existing = reminders.find(r => r.taskId === selectedTask.id);

    const newReminder = {
      id: existing?.id || crypto.randomUUID(),
      taskId: selectedTask.id,
      reminderDate: normalizeDate(form.reminderDate),
      reminderTime: normalizeTime(form.reminderTime),
      frequency: form.frequency,
    };

    if (existing) {
      await updateReminder(newReminder);
    } else {
      await addReminder(newReminder);
    }

    setRecentlySavedId(selectedTask.id);

    setTimeout(() => {  // Automatically scrolls to updated reminder after saving for user feedback
      taskRefs.current[selectedTask.id]?.scrollIntoView({   
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    setTimeout(() => setRecentlySavedId(null), 1500);

    setSelectedTask(null);
    setSelectedDate("");
    setForm({
      reminderDate: "",
      reminderTime: "",
      frequency: "once",
    });
  };

  const handleDeleteReminder = async (item) => {
  const taskId = item.taskId || item.id;

  const reminder = reminders.find(r => r.taskId === taskId);
    if (!reminder) return;

    await deleteReminder(reminder.id);

    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
      setForm({
        reminderDate: "",
        reminderTime: "",
        frequency: "once",
      });
    }
  };
  
  // Determines whether a reminder time has passed relative to current time
  const isOverdue = (r) => {
    if (!r) return false;

    const now = new Date();
    const due = buildDateTime(r.reminderDate, r.reminderTime);
    return due ? due < now : false;
  };

  const isToday = (r) => {
    if (!r?.reminderDate) return false;

    const taskDate = normalizeDate(r.reminderDate);
    const today = normalizeDate(new Date());

    return taskDate === today;
  };

  // Categorises reminders into overdue, today, and upcoming groups
  // based on computed datetime comparisons
  const { overdueReminders, todayReminders, upcomingReminders } = useMemo(() => {
    const overdue = [];
    const today = [];
    const upcoming = [];

    for (const r of enrichedReminders) {
      if (isOverdue(r)) {
        overdue.push(r);
      } else if (isToday(r)) {
        today.push(r);
      } else {
        upcoming.push(r);
      }
    }

    return {
      overdueReminders: overdue,
      todayReminders: today,
      upcomingReminders: upcoming,
    };
  }, [enrichedReminders]);

  // Filters tasks by selected date and excludes those already having reminders
  // ensures only valid selectable tasks are shown
  const filteredTasks = useMemo(() => {
  if (!selectedDate) return [];

  return tasks.filter((t) => {
    const sameDate =
      normalizeDate(t.date) === normalizeDate(selectedDate);

    const alreadyHasReminder = reminders.some(
      (r) => r.taskId === t.id
    );

    return sameDate && !alreadyHasReminder;
  });
}, [tasks, reminders, selectedDate]);

  const ReminderSection = ({ title, items, color }) => {
    if (!items.length) return null;

    return (
        <div className="mb-4">
        <p className={`text-sm font-semibold mb-2 ${color}`}>
            {title}
        </p>

        {items.map(task => {
            const overdue = isOverdue(task);

            return (
            <div
                key={task.id}
                ref={(el) => (taskRefs.current[task.id] = el)}
                className={`p-3 rounded mb-2 border transition-all duration-300 ${
                recentlySavedId === task.id
                    ? "bg-green-100 border-green-400 scale-[1.02]"
                    : overdue
                    ? "bg-red-50 border-red-300"
                    : "hover:bg-gray-100"
                }`}
            >
                <p className="font-medium">
                  {task.taskTitle}
                </p>

                <p className="text-xs text-gray-500 mb-1">
                ⏰ {task.reminderDate} {task.reminderTime}
                </p>

                <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                {task.frequency}
                </span>

                <div className="flex gap-3 mt-2">
                <button
                    onClick={() => selectTask(task)}
                    className="text-sm text-indigo-600"
                >
                    Edit
                </button>

                <button
                    onClick={() => handleDeleteReminder(task)}
                    className="text-sm text-red-500"
                >
                    Delete
                </button>
                </div>
            </div>
            );
        })}
        </div>
    );
  };
  
  return (
  <div className="flex h-full bg-white rounded-xl shadow overflow-hidden">

    {/* ================= LEFT PANEL ================= */}
    <div className="w-1/3 border-r p-4 overflow-y-auto">

      <p className="font-semibold mb-3">Reminders</p>

      <ReminderSection
        title="🔴 Overdue"
        items={overdueReminders}
        color="text-red-600"
      />

      <ReminderSection
        title="📅 Today"
        items={todayReminders}
        color="text-blue-600"
      />

      <ReminderSection
        title="⏭ Upcoming"
        items={upcomingReminders}
        color="text-gray-600"
      />

    </div>

    {/* ================= RIGHT PANEL ================= */}
    <div className="flex-1 p-6">

      <h2 className="text-xl font-semibold mb-4">
        Reminder Editor
      </h2>

      {/* 🔹 Step 1: Date Picker */}
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => {
          setSelectedDate(e.target.value);
          setSelectedTask(null);
        }}
        className="w-full border p-2 rounded mb-4"
      />

      {/* 🔹 Empty state: no date */}
      {!selectedDate && (
        <p className="text-gray-400 text-sm mt-4">
          Select a date to begin
        </p>
      )}

      {/* 🔹 Step 2: Task Selection (ONLY if date selected & no task yet) */}
      {selectedDate && !selectedTask && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Select Task
          </p>

          {filteredTasks.length === 0 && (
            <p className="text-gray-400 text-sm">
              No tasks for this date
            </p>
          )}

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {filteredTasks.map(task => (
              <button
                key={task.id}
                onClick={() => selectTask(task)}
                className="w-full text-left p-3 rounded bg-gray-100 hover:bg-gray-200"
              >
                <p className="font-medium">{task.title}</p>
                <p className="text-xs text-gray-500">
                  {task.time}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 🔹 Step 3: Selected Task Display */}
      {selectedTask && (
        <div className="mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <p className="text-xs uppercase tracking-wide text-indigo-500 mb-1">
            Selected Task
          </p>

          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-800">
              {selectedTask.title}
            </p>

            <button
              onClick={() => setSelectedTask(null)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* 🔹 Step 4: Reminder Form */}
      {selectedTask && (
      <>
        {/* 🔹 Reminder Date */}
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">
            Reminder Date
          </label>
          <input
            type="date"
            value={form.reminderDate}
            onChange={(e) =>
              setForm({ ...form, reminderDate: e.target.value })
            }
            className={`w-full border p-2 rounded transition
            ${!form.reminderDate ? "text-gray-400 blur-[0.2px]" : ""}`}
          />
        </div>

        {/* 🔹 Reminder Time */}
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">
            Reminder Time
          </label>
          <select
            value={form.reminderTime}
            onChange={(e) =>
              setForm({ ...form, reminderTime: e.target.value })
            }
            className="w-full border p-2 rounded text-gray-900"
          >
            <option value="" className="text-gray-400">
              Select time
            </option>

            {Array.from({ length: 24 }, (_, hour) =>
              [0, 15, 30, 45].map((minute) => {
                const time = `${hour
                  .toString()
                  .padStart(2, "0")}:${minute
                  .toString()
                  .padStart(2, "0")}`;

                return (
                  <option key={time} value={time}>
                    {time}
                  </option>
                );
              })
            )}
          </select>
        </div>

        {/* 🔹 Frequency */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            Frequency
          </label>
          <select
            value={form.frequency}
            onChange={(e) =>
              setForm({ ...form, frequency: e.target.value })
            }
            className="w-full border p-2 rounded text-gray-900 bg-white"
          >
            <option value="once" className="text-black">
              Once
            </option>

            <option value="daily" className="text-black">
              Daily
            </option>

            <option value="weekly" className="text-black">
              Weekly
            </option>
          </select>
        </div>

        {/* 🔹 Save Button */}
        <button
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-700 transition text-white px-4 py-2 rounded-lg font-medium"
        >
          Save Reminder
        </button>
      </>
      )}
    </div>
  </div>
);
};

export default Reminders;