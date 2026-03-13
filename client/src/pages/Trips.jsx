import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserTrips, leaveTrip, deleteTrip } from "../api/trips";
import CreateTrip from "../components/CreateTrip";
import {
  MapPin,
  CalendarDays,
  IndianRupee,
  Users,
  LogOut,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const user = storedUser?.data?.user || storedUser?.user || storedUser;
      setCurrentUserId(user?._id);
    } catch {}
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await getUserTrips();
      setTrips(res.data.data);
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTrip = async (e, tripId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to leave this trip?")) return;
    try {
      await leaveTrip(tripId);
      toast.success("You have left the trip");
      fetchTrips();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave trip");
    }
  };

  const handleDeleteTrip = async (e, tripId) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to delete this trip? This cannot be undone.",
      )
    )
      return;
    try {
      await deleteTrip(tripId);
      toast.success("Trip deleted");
      fetchTrips();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete trip");
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  return (
    <div className="p-6 md:p-10 font-['Lato'] text-[#2C2C2C] bg-[#F5F5F0] min-h-[calc(100vh-4rem)] relative">
      {/* Background texture via decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 rounded-full blur-3xl mix-blend-overlay pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#2E7D32]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-4xl font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-2">
              My Trips
            </h2>
            <p className="text-[#6D4C41] text-lg font-medium">
              Your shared travel workspaces
            </p>
          </div>
          <CreateTrip onTripCreated={fetchTrips} />
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#6D4C41]">
            Loading trips...
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm max-w-2xl mx-auto">
            <p className="text-[#6D4C41] text-lg mb-6">
              No trips yet. Create your first adventure!
            </p>
            <CreateTrip onTripCreated={fetchTrips} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {trips.map((trip) => (
              <div
                key={trip._id}
                onClick={() => navigate(`/dashboard/trip/${trip._id}`)}
                className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-6 hover:shadow-md hover:border-[#F4A261]/50 cursor-pointer group transition-all flex flex-col min-h-[220px]"
              >
                <h3 className="font-bold text-2xl font-['Playfair_Display'] text-[#2C2C2C] truncate group-hover:text-[#2E7D32] transition-colors mb-4 pr-1">
                  {trip.name}
                </h3>

                <div className="space-y-3 text-base text-[#6D4C41] flex-grow">
                  <div className="flex items-start gap-3">
                    <MapPin
                      size={18}
                      className="text-[#2E7D32] mt-0.5 shrink-0"
                    />
                    {trip.destinations?.length > 0 ? (
                      <span className="leading-snug">
                        {trip.destinations
                          .map((d) => `${d.city}, ${d.country}`)
                          .join(" • ")}
                      </span>
                    ) : (
                      <span className="text-[#6D4C41]/60 italic">
                        No destinations yet
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <CalendarDays
                      size={18}
                      className="text-[#6D4C41] shrink-0"
                    />
                    <span>
                      {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <IndianRupee
                      size={18}
                      className="text-[#2E7D32] shrink-0"
                    />
                    <span className="font-medium">
                      Budget: ₹{trip.budget.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-[#F4A261] shrink-0" />
                    <span>
                      {trip.members.length} Explorer
                      {trip.members.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#F5F5F0] text-[#6D4C41] flex items-center justify-center text-[10px] font-bold">
                      {trip.createdBy?.username
                        ? trip.createdBy.username[0].toUpperCase()
                        : "U"}
                    </div>
                    <span className="text-xs text-[#6D4C41] font-medium">
                      {trip.createdBy?.username}
                    </span>
                  </div>

                  {trip.createdBy?._id === currentUserId ? (
                    <button
                      onClick={(e) => handleDeleteTrip(e, trip._id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#6D4C41] hover:text-[#2C2C2C] hover:bg-[#F5F5F0] px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-[#E5E7EB]"
                      title="Delete Trip"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleLeaveTrip(e, trip._id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#6D4C41] hover:text-[#2C2C2C] hover:bg-[#F5F5F0] px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-[#E5E7EB]"
                      title="Leave Trip"
                    >
                      <LogOut size={14} /> Leave
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
