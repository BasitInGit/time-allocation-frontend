/**
 * Home Dashboard Component
 * Displays a summary of upcoming tasks and reminders.
 * Uses context-derived data and enriches reminder information
 * for consistent UI presentation across the dashboard.
 */
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

function Home() {
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const {tasks, getUpcomingTasks, getReminderTasks } = useAppContext();

  // Retrieves pre-filtered task data from context
  // avoids recalculating sorting/filtering inside this component
  const upcomingTasks = getUpcomingTasks();
  const reminders = getReminderTasks();

  // Enriches reminder data with corresponding task details
  // (title and color) for UI display consistency
  const enrichedReminders = reminders
  .map(rem => {
    const task = tasks.find(t => t.id === rem.taskId);
    if (!task) return null;

    return {
      ...rem,
      title: task.title,
      color: task.color,
    };
  })
  .filter(Boolean);

  return (
    <div className="flex-1 p-6 overflow-y-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">{today}</h2>

        <button
          onClick={() => navigate("/calendar")}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          + Add Task
        </button>
      </div>

      {/* Upcoming Tasks */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Upcoming Tasks</h3>

        <div className="space-y-3">
          {upcomingTasks.length === 0 && (
            <p className="text-sm text-gray-400">No upcoming tasks</p>
          )}

          {upcomingTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center p-4 bg-white rounded-lg shadow-sm"
            >
              {/* subtle color indicator */}
              <div className={`w-2 h-10 rounded mr-4 ${task.color}`}></div>

              <div>
                <p className="font-medium text-gray-800">{task.title}</p>
                <p className="text-sm text-gray-500">{task.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reminders */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Reminders</h3>

        <div className="space-y-3">
          {reminders.length === 0 && (
            <p className="text-sm text-gray-400">No reminders set</p>
          )}

          {enrichedReminders.map(reminder => (
            <div
              key={reminder.id}
              className="flex items-center p-4 bg-white rounded-lg shadow-sm"
            >
              {/* subtle color indicator */}
              <div className={`w-2 h-10 rounded mr-4 ${reminder.color}`}></div>

              <div>
                <p className="font-medium text-gray-800">{reminder.title}</p>
                <p className="text-sm text-gray-500">
                  ⏰ {reminder.reminderDate} {reminder.reminderTime}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default Home;