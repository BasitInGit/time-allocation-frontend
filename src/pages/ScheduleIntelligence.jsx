/**
 * Schedule Generation Module
 * 
 * This component implements a constraint-based scheduling system that:
 * - Integrates user preferences and category priorities
 * - Uses deadline analysis to adjust workload distribution
 * - Applies target-vs-actual time distribution balancing
 * - Converts generated schedules into persistent task entities
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateSchedule } from "../utils/Scheduler/schedulerEngine";
import { useAppContext } from "../context/AppContext";
import { analyzeDeadlineLoadByCategory } from "../utils/deadlineAnalyser";
import { getLocalDateStr, normalizeDate } from "../utils/dateUtils";
import {toMinutes, toTimeStr} from "../utils/Scheduler/timeUtils";
import { getActualWeeklyDistribution2 } from "../utils/analytics";

const INTENSITY_OPTIONS = ["Light", "Balanced", "Intense"];

const DEFAULT_PREFS = [
  { name: "Academic", preferredTime: "any", intensity: "medium" },
  { name: "Work", preferredTime: "any", intensity: "medium" },
  { name: "Health", preferredTime: "any", intensity: "medium" },
  { name: "Leisure", preferredTime: "any", intensity: "medium" },
];

const categoryColors = {
  Academic: "bg-indigo-500",
  Health: "bg-green-500",
  Leisure: "bg-yellow-500",
  Work: "bg-purple-500",
  };
export default function Generate() {
  const navigate = useNavigate();

  const {
    tasks,
    addTask,
    deadlines,
    timeDistribution,
    schedulePreferences,
    setSchedulePreferences,
  } = useAppContext();

  const HOURS = Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, "0");
    return `${h}:00`;
  });

  // ================= STATE =================
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [useTargetDistribution, setUseTargetDistribution] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState([]);

  useEffect(() => {
    if (schedulePreferences?.length) {
      setDraftPreferences(schedulePreferences);
    } else {
      setDraftPreferences(DEFAULT_PREFS);
    }
  }, [schedulePreferences]);

  // Provides contextual deadline pressure analysis per category
  // used to guide scheduling decisions
  const analysisByCategory = selectedDate
    ? analyzeDeadlineLoadByCategory(deadlines, selectedDate)
    : {};


  // Updates user-defined scheduling preferences per category
  // used as soft constraints in scheduling engine
  const updatePreference = (index, field, value) => {
    const updated = [...draftPreferences];
    updated[index] = {
    ...updated[index],
    [field]: value || "medium",
  };
    setDraftPreferences(updated);
  };

  const canSave = selectedDate && draftPreferences.length > 0;

  const handleSavePreferences = () => {
    setSchedulePreferences(draftPreferences);               // Stores user preferences for future scheduling sessions

    setSavedMessage(true);

    setTimeout(() => {
      setSavedMessage(false);
    }, 2000);
  };

  const [useExisting, setUseExisting] = useState(true);

  const [loading, setLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  // ================= GENERATE =================

  // Core scheduling pipeline:
  // validates inputs, builds constraints, calls scheduling engine,
  // converts output into persistent task objects
  const handleGenerate = async () => {
    if (
      !selectedDate ||
      !startTime ||
      !endTime ||
      toMinutes(endTime) <= toMinutes(startTime)             // Converts time strings into numeric values for comparison
    ) {
      alert("Please select valid date and time range");
      return;
    }

    setLoading(true);

    // Filters existing tasks for selected date to avoid overwriting or duplication
    // when generating new schedule entries
    const existingTasks = useExisting
      ? tasks.filter(t =>normalizeDate(t.date) === normalizeDate(selectedDate))
      : [];

    let distribution = [];

    // Computes category pressure based on difference between target vs actual weekly distribution
    // used to bias schedule generation towards underrepresented categories
    if (useTargetDistribution && selectedDate) {
      const actual = getActualWeeklyDistribution2(tasks, selectedDate);

      const rawDistribution = timeDistribution.map(targetCat => {
        const WEEKLY_HOURS = 7 * 24; 
        const targetValue = (targetCat.value/100) * WEEKLY_HOURS;
        const actualMatch = actual.find(a => a.name === targetCat.name);

        return {
          category: targetCat.name,
          delta: (targetValue || 0) - (actualMatch?.value || 0),
        };
      });
       
      // Normalises category weights by removing negative values
      // ensures only unmet category demand influences scheduling
      const clamped = rawDistribution.map(d => ({
        ...d,
        delta: Math.max(0, d.delta),
      }));

      const totalDelta = clamped.reduce((sum, d) => sum + d.delta, 0);

      distribution = clamped.map(d => ({
        category: d.category,
        pressure: totalDelta > 0 ? d.delta / totalDelta : 0,
      }));   // Converts raw category imbalance into probability weights
    }            // used by scheduler engine for prioritisation
    

    // Delegates schedule creation to external constraint-based scheduling engine
    // passing preferences, deadlines, and distribution constraints
    const schedule = generateSchedule({
      date: selectedDate,
      startTime,
      endTime,
      deadlines,
      distribution,
      preferences: draftPreferences,
      categoryAnalysis: analysisByCategory,
      existingTasks,
    });

    console.log("RAW SCHEDULE:", schedule);


    // Transforms raw scheduler output into application task schema
    // standardises formatting for persistence and UI rendering
    const generatedTasks = schedule.map((t, i) => ({
      id: `gen-${i}-${selectedDate}-${t.start}`,
      title: t.name,
      category: t.category,
      date: selectedDate,
      time: toTimeStr(t.start),
      duration: t.duration,
      color: categoryColors[t.category] || "bg-gray-500",
      generated: true,
    }));
    
    // Persists generated schedule tasks to backend storage sequentially
    // ensuring API consistency per task
    for (const task of generatedTasks) {
      await addTask(task);
    }

    setLoading(false);
    navigate("/calendar", {
      state: { date: selectedDate }
    });
  };

  // ================= UI =================
return (
  <div className="flex-1 p-6">
    <div className="max-w-3xl mx-auto">

      <h1 className="text-2xl font-bold mb-6">
        Schedule Generator
      </h1>

      {/* DATE + TIME WINDOW */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">

        <h2 className="text-lg font-semibold mb-5">
          Schedule Setup
        </h2>

        <div className="flex flex-col items-center gap-4">

          {/* DATE */}
          <div className="w-full max-w-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select schedule date
            </label>

            <input
              type="date"
              value={selectedDate}
              min={getLocalDateStr()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`w-full border p-2 rounded-lg bg-white shadow-sm ${
                !selectedDate ? "text-gray-400" : ""
              }`}
            />
          </div>

          {/* TIME SELECTORS */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">

            {/* START TIME */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start
              </label>

              <select
                value={startTime}
                disabled={!selectedDate}
                onChange={(e) => setStartTime(e.target.value)}
                className={`w-full border p-2 rounded-lg bg-white shadow-sm ${
                  !selectedDate
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "text-gray-700"
                }`}
              >
                <option value="">Select</option>

                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* END TIME */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End
              </label>

              <select
                value={endTime}
                disabled={!startTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`w-full border p-2 rounded-lg bg-white shadow-sm ${
                  !startTime
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "text-gray-700"
                }`}
              >
                <option value="">Select</option>

                {HOURS.filter(
                  h => toMinutes(h) > toMinutes(startTime || "00:00")
                ).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* helper text */}
          {!selectedDate && (
            <p className="text-sm text-gray-400">
              Select a date first
            </p>
          )}

          {selectedDate && !startTime && (
            <p className="text-sm text-gray-400">
              Select a start time
            </p>
          )}

          {startTime && !endTime && (
            <p className="text-sm text-gray-400">
              Select an end time
            </p>
          )}

        </div>
      </div>

      {/* FLOW CONTROL */}
      {selectedDate &&
        startTime &&
        endTime &&
        toMinutes(endTime) > toMinutes(startTime) && (
        <>

          {/* CATEGORY PREFERENCES */}
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">
                Category Preferences
              </h2>
            </div>

            {draftPreferences.map((cat, index) => {
              const analysis = analysisByCategory?.[cat.name] || {
                recommendedIntensity: "",
                warning: null,
                totalHours: 0,
              };

              return (
                <div
                  key={cat.name}
                  className="py-4 border-b border-gray-100 last:border-b-0"
                >

                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-gray-800">
                      {cat.name}
                    </p>
                  </div>

                  <div className="space-y-3">

                    {/* TIME OF DAY */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Time of day
                      </span>

                      <select
                        value={cat.preferredTime || "any"}
                        onChange={(e) =>
                          updatePreference(
                            index,
                            "preferredTime",
                            e.target.value
                          )
                        }
                        className="border rounded-lg px-3 py-1.5 text-sm bg-white"
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                        <option value="any">Any</option>
                      </select>
                    </div>

                    {/* INTENSITY */}
                    {cat.name !== "Leisure" && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Intensity
                        </span>

                        <select
                          value={cat.intensity || "medium"}
                          onChange={(e) =>
                            updatePreference(index, "intensity", e.target.value)
                          }
                          className="border rounded-lg px-3 py-1.5 text-sm bg-white"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    )}
                  </div>
                  
                  {/* RECOMMENDATION */}
                  {cat.name !== "Leisure" && analysis && (
                    <p className="text-xs text-indigo-600 mt-2">
                      Recommended: {analysis.recommendedIntensity}
                    </p>
                  )}
                  {/* WARNING */}
                  {analysis?.warning && (
                    <p className="text-xs text-red-500">
                      ⚠️ {analysis.warning}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="mt-5 flex flex-col items-start gap-2">
              <button
                onClick={handleSavePreferences}
                disabled={!canSave}
                className={`px-4 py-2 rounded-lg text-white transition ${
                  canSave
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                Save Preferences
              </button>

              {savedMessage && (
                <p className="text-sm text-green-600">
                  ✓ Preferences saved
                </p>
              )}
            </div>
            
          </div>

          {/* GENERATION OPTIONS */}
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">

            <h2 className="text-lg font-semibold mb-4">
              Generation Options
            </h2>

            <div className="space-y-4">

              {/* EXISTING TASKS */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={useExisting}
                  onChange={() => setUseExisting(!useExisting)}
                />

                <span className="text-sm text-gray-700">
                  Use existing calendar tasks
                </span>
              </label>

              {/* TARGET DISTRIBUTION */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={useTargetDistribution}
                  onChange={() =>
                    setUseTargetDistribution(!useTargetDistribution)
                  }
                />

                <span className="text-sm text-gray-700">
                  Aim for target distribution
                </span>
              </label>

            </div>
          </div>

          {/* GENERATE BUTTON */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition"
            >
              {loading ? "Generating..." : "Generate Schedule"}
            </button>
          </div>

        </>
      )}

    </div>
  </div>
);
}