import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { FiMenu, FiHome, FiCalendar, FiSettings, FiZap, FiBarChart,
  FiUser, FiBell } from "react-icons/fi";

function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/", icon: <FiHome /> },
    { name: "Calendar", path: "/calendar", icon: <FiCalendar />, },
    { name: "Generate", path: "/schedulePage", icon: <FiZap /> },
    { name: "Settings", path: "/settings", icon: <FiSettings /> },
    { name: "Analytics", path: "/analytics", icon: <FiBarChart /> },
    { name: "Reminders", path: "/reminderPage", icon: <FiBell /> },
    { name: "Deadline", path: "/deadline", icon: <FiBell /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Sidebar */}
      <div
        className={`bg-white shadow-md flex flex-col transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Top */}
        <div className="flex items-center justify-between p-4">
          {!collapsed && <h1 className="text-lg font-bold">Planner</h1>}

          <button onClick={() => setCollapsed(!collapsed)}>
            <FiMenu size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-2 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.name : ""}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition ${
                  isActive
                    ? "bg-indigo-100 text-indigo-700"
                    : "hover:bg-gray-100"
                }`}
              >
                <span className="text-lg">{item.icon}</span>

                {!collapsed && (
                  <span className="text-sm font-medium">
                    {item.name}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;