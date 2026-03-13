import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserTrips } from "../api/trips";
import { MapPin, CalendarDays, Lock, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FinalizedTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await getUserTrips();
      const all = res.data.data || [];
      const finalized = all.filter((t) => Boolean(t?.itineraryIsFinal));
      setTrips(finalized);
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  return (
    <div className="p-6 md:p-10 font-['Lato'] text-[#2C2C2C] bg-[#F5F5F0] min-h-[calc(100vh-4rem)] relative">
      {/* Background texture via decorative elements (match Trips page) */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 rounded-full blur-3xl mix-blend-overlay pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#6D4C41]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-3 relative inline-block">
              Finalized Itineraries
              <div className="absolute -bottom-2 left-0 w-1/3 h-1 bg-[#F4A261] rounded-full"></div>
            </h2>
            <p className="text-[#6D4C41] text-lg font-medium mt-4">
              Locked and ready to go. Your perfectly planned adventures.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-4 py-2.5 rounded-xl border border-[#2E7D32]/20 shadow-sm">
            <Lock size={16} /> Read-only Mode
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#6D4C41]">
            <div className="w-10 h-10 border-4 border-[#2E7D32]/20 border-t-[#2E7D32] rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-medium">Loading your finalized trips...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-[#F5F5F0] rounded-full flex items-center justify-center mb-6">
              <Lock size={32} className="text-[#6D4C41]/50" />
            </div>
            <h3 className="font-bold text-2xl font-['Playfair_Display'] text-[#2C2C2C] mb-2">
              No Finalized Trips
            </h3>
            <p className="text-[#6D4C41] text-lg text-center max-w-sm px-4">
              Once you finalize an itinerary in the trip planner, it will appear here.
            </p>
            <Button
              onClick={() => navigate("/dashboard/trips")}
              className="mt-8 bg-[#2E7D32] hover:bg-[#1b4b1e] text-white px-6 py-3 rounded-xl shadow-sm transition-all text-base"
            >
              Go to Trip Planner
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {trips.map((trip) => (
              <div
                key={trip._id}
                onClick={() => navigate(`/dashboard/finalized/${trip._id}`)}
                className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-[#2E7D32]/30 cursor-pointer group transition-all duration-300 flex flex-col overflow-hidden"
              >
                <div className="h-2 bg-[#2E7D32]"></div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <h3 className="font-bold text-2xl font-['Playfair_Display'] text-[#2C2C2C] line-clamp-2 group-hover:text-[#2E7D32] transition-colors flex-grow">
                      {trip.name}
                    </h3>
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#F5F5F0] group-hover:bg-[#2E7D32]/10 transition-colors shrink-0 mt-1">
                      <Lock size={14} className="text-[#6D4C41] group-hover:text-[#2E7D32] transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-4 text-base text-[#6D4C41] mb-6 flex-grow">
                    {trip.destinations?.length > 0 && (
                      <div className="flex items-start gap-3">
                        <MapPin size={18} className="text-[#F4A261] mt-1 shrink-0" />
                        <span className="leading-relaxed font-medium">
                          {trip.destinations
                            .map((d) => `${d.city}, ${d.country}`)
                            .join(" • ")}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 bg-[#F5F5F0] p-3 rounded-xl border border-[#E5E7EB]/50">
                      <CalendarDays size={18} className="text-[#6D4C41] shrink-0" />
                      <span className="font-medium text-[#2C2C2C] text-sm">
                        {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
                    <span className="text-sm font-bold text-[#6D4C41] uppercase tracking-wider">
                      View Itinerary
                    </span>
                    <span className="w-8 h-8 rounded-full bg-[#E5E7EB]/50 group-hover:bg-[#F4A261] flex items-center justify-center transition-colors">
                      <ArrowLeft size={16} className="text-[#2C2C2C] group-hover:text-white rotate-180 transition-colors" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

