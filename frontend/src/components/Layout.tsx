import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const navigation = [
    { name: "Home", href: "/", icon: "🏠" },
    { name: "App Builder", href: "/app-builder", icon: "🔧" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? "w-64" : "w-16"} bg-base-200 transition-all duration-300 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div
          className={`border-b border-base-300 flex items-center transition-all duration-300 ${isSidebarOpen ? "p-4 justify-between" : "p-2 justify-center"}`}
        >
          <div
            className={`overflow-hidden transition-all duration-300 ${isSidebarOpen ? "opacity-100 w-auto" : "opacity-0 w-0"}`}
          >
            <h1 className="text-2xl font-bold text-primary whitespace-nowrap">
              OpenFoundry
            </h1>
            <p className="text-sm text-base-content/70 whitespace-nowrap">
              App Development Platform
            </p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="btn btn-square btn-ghost btn-sm flex-shrink-0"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <svg
              className="w-5 h-5 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isSidebarOpen
                    ? "M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    : "M13 5l7 7-7 7M5 5l7 7-7 7"
                }
              />
            </svg>
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav
          className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "p-2" : "p-1"}`}
        >
          <ul className="menu">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center transition-all duration-300 ${
                    location.pathname === item.href ? "active" : ""
                  } ${isSidebarOpen ? "justify-start" : "tooltip tooltip-right justify-center p-2"}`}
                  {...(!isSidebarOpen && { "data-tip": item.name })}
                >
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  <span
                    className={`ml-3 overflow-hidden transition-all duration-300 whitespace-nowrap ${isSidebarOpen ? "opacity-100 w-auto" : "opacity-0 w-0"}`}
                  >
                    {item.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div
          className={`border-t border-base-300 transition-all duration-300 ${isSidebarOpen ? "p-4 opacity-100" : "p-0 opacity-0 h-0"} overflow-hidden`}
        >
          <div className="text-xs text-base-content/50 whitespace-nowrap">
            Version 1.0.0
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
