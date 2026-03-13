import FriendsList from "../components/FriendsList";
import UserSearch from "../components/UserSearch";
import FriendRequests from "../components/FriendRequests";
import CreateTrip from "../components/CreateTrip";
import Trips from "./Trips";
import TripDetails from "./TripDetails";
import DashboardHome from "./DashboardHome";
import { Button } from "../components/ui/button";
import { Map, ListOrdered, Users, Plane, Lock } from "lucide-react";
import VoiceChat from "../components/VoiceChat";
import FinalizedTrips from "./FinalizedTrips";
import FinalizedItinerary from "./FinalizedItinerary";
import { Link } from "react-router-dom";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
} from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout=async () => {
    localStorage.removeItem("token");
    navigate("/login");
  }
  return (
    <div className="min-h-screen bg-[#F5F5F0] font-['Lato'] text-[#2C2C2C]">
      {/* Top Navigation */}
      <header className="bg-white border-b border-[#E5E7EB] shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2E7D32] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Map size={18} />
            </div>
            <h1 className="text-xl font-bold font-['Playfair_Display'] text-[#2C2C2C] tracking-wide">
              Planora
            </h1>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
           
            <NavLink
              to="/dashboard/friends"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                  ? "bg-[#6D4C41]/10 text-[#6D4C41]"
                  : "text-[#6D4C41]/70 hover:bg-[#F5F5F0] hover:text-[#6D4C41]"
                }`
              }
            >
              <Users size={18} />
              <span className="hidden sm:inline">Friends</span>
            </NavLink>
            <NavLink
              to="/dashboard/trips"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                  ? "bg-[#2E7D32]/10 text-[#2E7D32]"
                  : "text-[#6D4C41]/70 hover:bg-[#F5F5F0] hover:text-[#2E7D32]"
                }`
              }
            >
              <Plane size={18} />
              <span className="hidden sm:inline">Trips</span>
            </NavLink>
            <NavLink
              to="/dashboard/finalized"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                  ? "bg-[#6D4C41]/10 text-[#6D4C41]"
                  : "text-[#6D4C41]/70 hover:bg-[#F5F5F0] hover:text-[#6D4C41]"
                }`
              }
            >
              <Lock size={18} />
              <span className="hidden sm:inline">Finalized</span>
            </NavLink>

            <div className="h-6 w-[1px] bg-[#E5E7EB] mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <CreateTrip onTripCreated={() => navigate("/dashboard/trips")} />
              <UserSearch />
              <FriendRequests />
              <Button onClick={handleLogout} variant="outline" className="border-[#E5E7EB] text-[#6D4C41] hover:bg-[#F5F5F0]">
                Logout
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="friends" element={<FriendsList />} />
          <Route path="trips" element={<Trips />} />
          <Route path="finalized" element={<FinalizedTrips />} />
          <Route path="finalized/:tripId" element={<FinalizedItinerary />} />
          <Route path="trip/:tripId" element={<TripDetails />} />
          <Route path="voice/:tripId" element={<VoiceChat />} />
          <Route index element={<DashboardHome />} />
        </Routes>
      </main>
    </div>
  );
}
