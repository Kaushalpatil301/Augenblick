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
          <div className="flex flex-col items-center justify-center py-20 text-[#6D4C41]">
            <div className="w-10 h-10 border-4 border-[#2E7D32]/20 border-t-[#2E7D32] rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-medium">Loading your trips...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-[#F5F5F0] rounded-full flex items-center justify-center mb-6">
              <MapPin size={32} className="text-[#6D4C41]/50" />
            </div>
            <h3 className="font-bold text-2xl font-['Playfair_Display'] text-[#2C2C2C] mb-2">
              No Trips Yet
            </h3>
            <p className="text-[#6D4C41] text-lg mb-8 text-center max-w-sm px-4">
              Your dashboard is looking a little empty. Time to plan a new adventure!
            </p>
            <CreateTrip onTripCreated={fetchTrips} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {trips.map((trip) => {
              const destCount = trip.destinations?.length || 0;
              const hasMain = trip.mainDestination?.city;
              const hasIntermediates = destCount > 0;
              
              // Determine what to show for the primary location
              let displayCity = "";
              let displayCountry = "";
              
              if (hasMain) {
                displayCity = trip.mainDestination.city;
                displayCountry = trip.mainDestination.country;
              } else if (hasIntermediates) {
                 // Fallback if mainDestination is missing but intermediate stops exist (edge case)
                 const lastDest = trip.destinations[destCount - 1];
                 displayCity = lastDest.city;
                 displayCountry = lastDest.country;
              }

              return (
                <div
                  key={trip._id}
                  onClick={() => navigate(`/dashboard/trip/${trip._id}`)}
                  className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-[#2E7D32]/30 cursor-pointer group transition-all duration-300 flex flex-col overflow-hidden min-h-[260px]"
                >
                  <div className="h-2 bg-[#2E7D32]"></div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="font-bold text-2xl font-['Playfair_Display'] text-[#2C2C2C] line-clamp-2 group-hover:text-[#2E7D32] transition-colors mb-5 pr-1">
                      {trip.name}
                    </h3>

                    <div className="space-y-4 text-base text-[#6D4C41] flex-grow mb-6">
                      <div className="flex items-start gap-3">
                        <MapPin
                          size={18}
                          className="text-[#F4A261] mt-0.5 shrink-0"
                        />
                        {displayCity ? (
                          <span className="leading-snug font-medium text-[#2C2C2C]">
                            {displayCity}, {displayCountry}
                            {hasIntermediates && (
                              <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F4A261]/10 text-[#F4A261] border border-[#F4A261]/20">
                                +{destCount} STOP{destCount > 1 ? 'S' : ''}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[#6D4C41]/60 italic">
                            No destinations yet
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 bg-[#F5F5F0] p-3 rounded-xl border border-[#E5E7EB]/50">
                        <CalendarDays
                          size={18}
                          className="text-[#6D4C41] shrink-0"
                        />
                        <span className="font-medium text-[#2C2C2C] text-sm">
                          {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <IndianRupee
                          size={18}
                          className="text-[#2E7D32] shrink-0"
                        />
                        <span className="font-bold text-[#2C2C2C]">
                          ₹{trip.budget.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Users size={18} className="text-[#6D4C41]/80 shrink-0" />
                        <span className="font-medium">
                          {trip.members.length} Explorer{trip.members.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#F5F5F0] text-[#6D4C41] flex items-center justify-center text-[11px] font-bold border border-[#E5E7EB]">
                          {trip.createdBy?.username
                            ? trip.createdBy.username[0].toUpperCase()
                            : "U"}
                        </div>
                        <span className="text-sm text-[#6D4C41] font-bold">
                          {trip.createdBy?.username}
                        </span>
                      </div>

                      {trip.createdBy?._id === currentUserId ? (
                        <button
                          onClick={(e) => handleDeleteTrip(e, trip._id)}
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F5F5F0] text-[#6D4C41] hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete Trip"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleLeaveTrip(e, trip._id)}
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F5F5F0] text-[#6D4C41] hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Leave Trip"
                        >
                          <LogOut size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
