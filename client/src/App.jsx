import { useState } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Planner from "./components/Planner";
import Itinerary from "./components/Itinerary";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import { Map, ListOrdered } from "lucide-react";

function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              A
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Agentic Travel
            </h1>
          </div>

          <nav className="flex gap-2">
            <NavLink
              to="/dashboard/planner"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <Map size={18} />
              Planner
            </NavLink>
            <NavLink
              to="/dashboard/itinerary"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <ListOrdered size={18} />
              Itinerary
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto">
        <Routes>
          <Route path="planner" element={<Planner />} />
          <Route path="itinerary" element={<Itinerary />} />
          <Route index element={<Navigate to="planner" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
