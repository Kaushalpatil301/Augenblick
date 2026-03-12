import Itinerary from "../components/Itinerary";
import Planner from "../components/Planner";
import FriendsList from "../components/FriendsList";
import UserSearch from "../components/UserSearch";
import FriendRequests from "../components/FriendRequests";
import CreateTrip from "../components/CreateTrip";
import Trips from "./Trips";
import TripDetails from "./TripDetails";
import { Map, ListOrdered, Users, Plane } from "lucide-react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
} from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
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

          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink
              to="/dashboard/planner"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <Map size={18} />
              <span className="hidden sm:inline">Planner</span>
            </NavLink>
            <NavLink
              to="/dashboard/itinerary"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <ListOrdered size={18} />
              <span className="hidden sm:inline">Itinerary</span>
            </NavLink>
            <NavLink
              to="/dashboard/friends"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-green-50 text-green-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <Users size={18} />
              <span className="hidden sm:inline">Friends</span>
            </NavLink>
            <NavLink
              to="/dashboard/trips"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-orange-50 text-orange-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <Plane size={18} />
              <span className="hidden sm:inline">Trips</span>
            </NavLink>

            <div className="h-6 w-[1px] bg-gray-200 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-1">
              <CreateTrip onTripCreated={() => navigate("/dashboard/trips")} />
              <UserSearch />
              <FriendRequests />
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto">
        <Routes>
          <Route path="planner" element={<Planner />} />
          <Route path="itinerary" element={<Itinerary />} />
          <Route path="friends" element={<FriendsList />} />
          <Route path="trips" element={<Trips />} />
          <Route path="trip/:tripId" element={<TripDetails />} />
          <Route index element={<Navigate to="planner" replace />} />
        </Routes>
      </main>
    </div>
  );
}
