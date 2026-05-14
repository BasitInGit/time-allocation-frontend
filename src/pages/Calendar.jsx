/**
 * Calendar Component
 * Implements a custom scheduling engine with collision-aware event layout,
 * converting time-based tasks into a visual timeline representation.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useNavigate, useLocation } from "react-router-dom";
import { getLocalDateStr, normalizeDate } from "../utils/dateUtils";
import { toHours, toTimeStr, normalizeTime } from "../utils/Scheduler/timeUtils";

function Calendar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(
    location.state?.date || getLocalDateStr()
  );

  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const scrollRef = useRef(null);
  const layoutRef = useRef([]);

  const [showAbove, setShowAbove] = useState(false);
  const [showBelow, setShowBelow] = useState(false);

  const {
    tasks,
    defaultTask,
    addTask,
    updateTask,
    deleteTask: deleteGlobalTask,
    reminders,
  } = useAppContext();

  const [newTask, setNewTask] = useState(defaultTask);

  const categoryColors = {
    Academic: "bg-indigo-500",
    Health: "bg-green-500",
    Leisure: "bg-yellow-500",
    Work: "bg-purple-500",
  };

  // Checks if a reminder exists for a given task
  const hasReminder = (taskId) =>
    reminders.some((r) => r.taskId === taskId);

  const openCreateModal = () => {
    setNewTask({ ...defaultTask, date: selectedDate });
    setShowModal(true);
  };

  // Creates or updates a task depending on whether an ID exists
  const saveTask = async () => {
    const color = categoryColors[newTask.category] || "bg-gray-500";

    const taskData = {
      ...newTask,
      date: normalizeDate(newTask.date || selectedDate),
      color,
    };

    try {
      if (newTask.id) await updateTask(taskData);
      else await addTask(taskData);

      setNewTask(defaultTask);
      setShowModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Each hour is mapped to 80px in the UI grid
  // Converts time string into vertical pixel position
  const getEventTop = (time) => {
    const normalized = normalizeTime(time);
    const hours = normalized ? toHours(normalized) : null;
    return hours === null ? 0 : hours * 80;
  };

  const getEndTime = (startTime, durationHours) => {
    const normalized = normalizeTime(startTime);
    const startHours = normalized ? toHours(normalized) : null;

    if (startHours === null) return "";

    const endHours = startHours + Number(durationHours || 0);
    return toTimeStr(endHours);
  };

  const getEventHeight = (durationHours) => {
    const duration = Number(durationHours);
    if (!duration || duration <= 0) return 0;
    return Math.max(duration * 80, 60);
  };

  // Normalises raw task data into a consistent format for calendar rendering
  const normalizeEvent = (e) => {
    const date = normalizeDate(e.date);
    if (!date) return null;

    const time =
      typeof e.start === "number"
        ? toTimeStr(e.start)
        : normalizeTime(e.time);

    if (!time) return null;

    return {
      id: e.id || `task-${date}-${time}-${e.title}`,
      title: e.title || "Untitled",
      date,
      time,
      duration: Number(e.duration) || 1,
      category: e.category,
      color: e.color || "bg-gray-500",
    };
  };

  const layoutEvents = useMemo(() => {
    return tasks
      .map(normalizeEvent)
      .filter(Boolean)
      .filter(
        (e) => normalizeDate(e.date) === normalizeDate(selectedDate)
      );
  }, [tasks, selectedDate]);

  // Assigns events into non-overlapping visual columns
  // If two events overlap in time, they are placed in separate columns
  // This ensures the calendar visually represents concurrent tasks
  const computeEventLayout = (events) => {
    const enriched = events.map((e) => {
      const top = getEventTop(e.time);
      const height = getEventHeight(e.duration);

      return { ...e, top, height, bottom: top + height };
    });

    const sorted = [...enriched].sort((a, b) => a.top - b.top);

    const layout = [];

    for (const current of sorted) {
      let col = 0;

      while (
        layout.some(
          (e) =>
            e.column === col &&
            e.bottom > current.top &&
            current.bottom > e.top
        )
      ) {
        col++;
      }

      layout.push({ ...current, column: col });
    }

    return layout.map((event) => {
      const overlapping = layout.filter(
        (e) =>
          e.top < event.bottom && event.top < e.bottom
      );

      const totalColumns =
        Math.max(...overlapping.map((e) => e.column)) + 1;

      return { ...event, totalColumns };
    });
  };

  // Prevents recalculation of layout unless tasks or selected date changes
  const layout = useMemo(
    () => computeEventLayout(layoutEvents),
    [layoutEvents]
  );

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTop = 0;
      checkVisibleEvents(layoutRef.current);
    });
  }, [selectedDate]);

  const checkVisibleEvents = (layoutData) => {
    const el = scrollRef.current;

    if (!el || !layoutData?.length) {
      setShowAbove(false);
      setShowBelow(false);
      return;
    }

    const visibleTop = el.scrollTop;
    const visibleBottom = visibleTop + el.clientHeight;

    // Detects whether events exist outside visible scroll area
    // Used to show "More above/below" indicators
    let above = false;
    let below = false;

    for (const e of layoutData) {
      if (e.bottom <= visibleTop) above = true;
      if (e.top >= visibleBottom) below = true;
    }

    setShowAbove(above);
    setShowBelow(below);
  };

  const handleDeleteTask = (taskId) => {
    deleteGlobalTask(taskId);
    setSelectedTask(null);
  };

  const editTask = (task) => {
    setNewTask(task);
    setSelectedTask(null);
    setShowModal(true);
  };

  const isTaskValid =
    normalizeDate(newTask.date) &&
    normalizeTime(newTask.time) &&
    Number(newTask.duration) > 0;


  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Calendar</h2>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded-lg px-2 py-1 shadow-sm"
          />
        </div>

        <button
          onClick={openCreateModal}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
        >
          + Create Task
        </button>

      </div>

      <div className="relative">

        {/* Scrollable calendar */}
        <div
          ref={scrollRef} 
          className="h-[70vh] overflow-y-auto relative bg-white rounded-xl shadow"
          onScroll={() => {
            requestAnimationFrame(() => {
              checkVisibleEvents(layoutRef.current);
            });
          }}
        >
          <div className="relative" style={{ height: `${24 * 80}px` }}>
            {/* Hour rows */}
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="flex border-b border-gray-200 h-20 items-start">
                <div className="w-20 text-sm text-gray-500">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                <div className="flex-1 relative" />
              </div>
            ))}

            {/* Events */}
            {layout.map((event) => {
              const now = new Date();
              const eventTime = new Date(`${event.date}T${event.time}`);

              const isPast = eventTime < now;
              const width = 100 / event.totalColumns;
              const left = (event.column * 100) / event.totalColumns;

              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedTask(event)}
                  className={`${event.color} text-white rounded-lg px-3 py-2 absolute cursor-pointer overflow-hidden`}
                  style={{
                    top: `${event.top}px`,
                    height: `${event.height}px`,
                    width: `${width}%`,
                    left: `${left}%`,
                  }}
                >
                  {isPast && (
                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-red-500 transform -translate-y-1/2 pointer-events-none" />
                  )}
                  <p className="font-medium text-sm">{event.title}</p>
                  <p className="text-xs opacity-90">
                    {event.time} – {getEndTime(event.time, event.duration)}
                  </p>

                  <div className="mt-1 text-xs">
                  { hasReminder(event.id) ? (
                    <span className="text-green-200 font-medium">
                      🔔 Reminder set
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reminderPage/${event.id}`);
                      }}
                      className="text-white underline opacity-90 hover:opacity-100"
                    >
                      + Add reminder
                    </button>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      
      {/* Indicators */}
        {showAbove && (
          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-[11px] px-2 py-1 rounded-full shadow-sm">
            ↑ More
          </div>
        )}

        {showBelow && (
          <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-[11px] px-2 py-1 rounded-full shadow-sm">
            ↓ More
          </div>
        )}
      </div>

      {showModal && (
      <div className="absolute inset-0 bg-black/20 bg-opacity-30 flex items-center justify-center z-40">
        <div className="bg-white rounded-xl p-6 w-96 shadow-lg">

          <h3 className="text-lg font-semibold mb-4">Create Task</h3>

          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) =>
              setNewTask({ ...newTask, title: e.target.value })
            }
            className="w-full border p-2 rounded mb-3"
          />

          <select
            value={newTask.category}
            onChange={(e) =>
              setNewTask({ ...newTask, category: e.target.value })
            }
            className="w-full border p-2 rounded mb-3"
          >
            {Object.keys(categoryColors).map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>

          <input
            type="date"
            value={newTask.date || selectedDate}
            min={getLocalDateStr()} // disable past dates
            onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
            className="w-full border p-2 rounded mb-3"
          />

          <select
            value={newTask.time}
            onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
            className="w-full border p-2 rounded mb-3"
          >
            <option value="">Select time</option>

            {Array.from({ length: 24 }, (_, hour) =>
              [0, 15, 30, 45].map((minute) => {
                const time = `${hour.toString().padStart(2, "0")}:${minute
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

          <input
            type="number"
            min="0.5"
            step="0.5"
            placeholder="Duration (hours)"
            value={newTask.duration}
            onChange={(e) =>
              setNewTask({ ...newTask, duration: Number(e.target.value) })
            }
            className="w-full border p-2 rounded mb-3"
          />

          <textarea
            placeholder="Details"
            value={newTask.details}
            onChange={(e) =>
              setNewTask({ ...newTask, details: e.target.value })
            }
            className="w-full border p-2 rounded mb-3"
          />

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-gray-600"
            >
              Cancel
            </button>

            <button
              onClick={saveTask}
              className={`px-4 py-2 rounded ${isTaskValid ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              disabled={!isTaskValid}
            >
              Save
            </button>
          </div>
        </div>
      </div>
      )}

      {selectedTask && (
      <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg w-96 overflow-hidden">
          <div className={`h-2 w-full ${selectedTask.color}`} />
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Task Details</h3>

            <p className="mb-2"><strong>Title:</strong> {selectedTask.title}</p>
            <p className="mb-2"><strong>Category:</strong> {selectedTask.category}</p>
            <p className="mb-2"><strong>Time:</strong> {selectedTask.time}</p>
            <p className="mb-2"><strong>Duration:</strong> {selectedTask.duration} hour(s)</p>

            {selectedTask.details && (
              <p className="mb-2"><strong>Details:</strong> {selectedTask.details}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => editTask(selectedTask)}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg"
              >
                Edit
              </button>

              <button
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg"
              >
                Delete
              </button>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-gray-600"
              >
                Close
              </button>
          </div>
          </div>
          </div>
      </div>
    )}
    </div>
  );
}

export default Calendar;
