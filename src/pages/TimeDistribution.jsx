import { useState, useRef, useEffect, useMemo } from "react"
import { useAppContext } from "../context/AppContext";
import { PieChart, Pie, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

const AVAILABLE_CATEGORIES = [
  "Academic",
  "Health",
  "Leisure",
  "Work",
]

const CATEGORY_COLORS = {
  Academic: "#6366F1",
  Health: "#10B981",
  Leisure: "#F59E0B",
  Work: "#14B8A6",
};

export default function TimeDistribution() {
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draftCategories, setDraftCategories] = useState([]);

  const openDrawer = () => {
    setDraftCategories(categories);
    setIsDrawerOpen(true);
  };

  const { timeDistribution, updateTimeDistribution, getWeeklyActualDistribution, weekLabel } = useAppContext();
  
  const categories = useMemo(() => {
    const source =
      timeDistribution?.length
        ? timeDistribution
        : [
            { name: "Academic", value: 25 },
            { name: "Health", value: 25 },
            { name: "Leisure", value: 25 },
            { name: "Work", value: 25 },
          ];

    return source.map((entry) => ({
      ...entry,
      fill:
        CATEGORY_COLORS[entry.name] ||
        "#9CA3AF",
    }));
  }, [timeDistribution]);

  const total = draftCategories.reduce((sum, c) => sum + c.value, 0);
  const isValidTotal = total === 100;

  const target = categories;

  const actualRaw = getWeeklyActualDistribution();
  const actual = actualRaw?.length
    ? actualRaw
    : [];
  const hasActual = actual.length > 0;

  const addCategory = (name) => {
    if (draftCategories.find((c) => c.name === name)) return;

    setDraftCategories([
      ...draftCategories,
      {
        name,
        value: 0,
        fill: CATEGORY_COLORS[name] || "#9CA3AF",
      },
    ]);
  };

  const removeCategory = (name) => {
    const filtered = draftCategories.filter((c) => c.name !== name);
    if (filtered.length === 0) return;
    setDraftCategories(filtered);
  };

  const updateValue = (index, value) => {
    const updated = [...draftCategories];
    updated[index] = {
      ...updated[index],
      value: Number(value),
    };
    setDraftCategories(updated);
  };

  const handleSave = async () => {
    const total = draftCategories.reduce(
      (sum, c) => sum + c.value,
      0
    );

    if (total !== 100) return;

    try {
      await updateTimeDistribution(
        draftCategories.map(c => ({
          id: c.id || crypto.randomUUID(),
          name: c.name,
          value: c.value
        }))
      );

      setIsDrawerOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = () => {
    setIsDrawerOpen(false);
    setDraftCategories([]);
  };

  const targetWithColors = target.map((entry) => ({
    ...entry,
    fill: CATEGORY_COLORS[entry.name] || "#9CA3AF",
  }));

  const actualWithColors = actual.map((entry) => ({
    ...entry,
    fill: CATEGORY_COLORS[entry.name] || "#9CA3AF",
  }));
  return (
    <div className="flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-baseline justify-between mb-6">
  
        <h1 className="text-xl font-bold">
          Weekly Time Distribution
        </h1>

        <p className="text-sm text-gray-500">
          {weekLabel}
        </p>

      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* TARGET */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-2">Target Distribution</h2>
          
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={targetWithColors}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            {target.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: CATEGORY_COLORS[cat.name] }}
                />
                <span className="text-sm text-gray-600">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actual */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-2">Actual Distribution</h2>

          {actual.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400">
              No tasks logged this week
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={actualWithColors}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            {actual.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: CATEGORY_COLORS[cat.name] }}
                />
                <span className="text-sm text-gray-600">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TARGET vs ACTUAL COMPARISON */}
      <div className={`bg-white p-4 rounded-xl shadow mb-6 ${hasActual ? "" : "opacity-50"}`}>

        <h2 className="font-semibold mb-4">
          Target vs Actual (Comparison)
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={target.map(t => ({
              name: t.name,
              target: t.value,
              actual: actual.find(a => a.name === t.name)?.value || 0
            }))}
          >

            <XAxis dataKey="name" />
            <YAxis />
            <Bar dataKey="target" fill="#6366F1" />
            <Bar dataKey="actual" fill="#10B981" />

          </BarChart>
        </ResponsiveContainer>
      </div>

      <button
        onClick={openDrawer}
        className="flex-1 bg-indigo-600 text-white p-2 rounded-xl"
      >
        Edit Target Distribution
      </button>

      {isDrawerOpen && (
    <div className="fixed inset-0 z-50">
      
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleCancel}
      />

      {/* drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-6 overflow-y-auto transform transition-transform">
        
        <h2 className="text-lg font-semibold mb-4">
          Edit Time Distribution
        </h2>

        {/* categories */}
        {draftCategories.map((cat, index) => (
          <div key={index} className="mb-3 border p-3 rounded">
            
            <div className="flex justify-between">
              <span>{cat.name}</span>

              <button
                onClick={() => removeCategory(cat.name)}
                className="text-red-500 text-sm"
              >
                Remove
              </button>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={cat.value}
              onChange={(e) => updateValue(index, e.target.value)}
              className="w-full"
            />

            <input
              type="number"
              value={cat.value}
              onChange={(e) => updateValue(index, e.target.value)}
              className="w-full border mt-1 p-1"
            />

          </div>
        ))}

        {/* add categories */}
        <div className="flex flex-wrap gap-2 mt-4">
          {AVAILABLE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => addCategory(cat)}
              className="px-3 py-1 bg-gray-200 rounded-full text-sm"
            >
              + {cat}
            </button>
          ))}
        </div>

        {/* actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={!isValidTotal}
            className={`flex-1 p-2 rounded-xl text-white ${
              isValidTotal
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Save
          </button>

          <button
            onClick={handleCancel}
            className="flex-1 bg-gray-300 p-2 rounded-xl"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
    )}

    </div>
  );
}