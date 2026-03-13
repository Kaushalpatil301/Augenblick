import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserTrips } from "../api/trips";
import { MapPin, CalendarDays, Lock } from "lucide-react";

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-4xl font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-2">
              Finalized
            </h2>
            <p className="text-[#6D4C41] text-lg font-medium">
              Locked itineraries ready to follow
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#6D4C41] bg-white px-3 py-2 rounded-full border border-[#E5E7EB] shadow-sm">
            <Lock size={16} /> Read-only
          </div>
        </div>
        {loading ? (
          <div className="text-center py-20 text-[#6D4C41]">Loading...</div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm max-w-2xl mx-auto">
            <p className="text-[#6D4C41] text-lg">
              No finalized itineraries yet.
            </p>
            <p className="text-sm text-[#6D4C41]/70 mt-2">
              Finalize a trip itinerary to see it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {trips.map((trip) => (
              <div
                key={trip._id}
                onClick={() => navigate(`/dashboard/finalized/${trip._id}`)}
                className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-6 hover:shadow-md hover:border-[#F4A261]/50 cursor-pointer group transition-all flex flex-col min-h-[210px]"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="font-bold text-2xl font-['Playfair_Display'] text-[#2C2C2C] truncate group-hover:text-[#2E7D32] transition-colors pr-1">
                    {trip.name}
                  </h3>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#6D4C41] bg-[#6D4C41]/5 px-2 py-1 rounded-full border border-[#6D4C41]/10 shrink-0">
                    <Lock size={12} /> FINAL
                  </div>
                </div>

                <div className="space-y-3 text-base text-[#6D4C41] flex-grow">
                  {trip.destinations?.length > 0 && (
                    <div className="flex items-start gap-3">
                      <MapPin size={18} className="text-[#2E7D32] mt-0.5 shrink-0" />
                      <span className="leading-snug">
                        {trip.destinations
                          .map((d) => `${d.city}, ${d.country}`)
                          .join(" • ")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <CalendarDays size={18} className="text-[#6D4C41] shrink-0" />
                    <span>
                      {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
                  <span className="text-xs text-[#6D4C41] font-medium">
                    View itinerary
                  </span>
                  <span className="text-xs font-bold text-[#2E7D32] group-hover:underline">
                    Open
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

