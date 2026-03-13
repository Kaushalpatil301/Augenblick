import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getTripById } from "../api/trips";
import { Lock } from "lucide-react";
import TripMap from "../components/TripMap";
import Itinerary from "../components/Itinerary";
import AIAssistant from "../components/AIAssistant";

export default function FinalizedItinerary() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const user = storedUser?.data?.user || storedUser?.user || storedUser;
      setCurrentUserId(user?._id || null);
    } catch {}
  }, []);

  const fetchTrip = async () => {
    setLoading(true);
    try {
      const res = await getTripById(tripId);
      setTrip(res.data.data);
    } catch (err) {
      setTrip(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  const isFinal = Boolean(trip?.itineraryIsFinal);
  const title = useMemo(() => trip?.name || "Finalized itinerary", [trip?.name]);

  return (
    <div className="p-6 md:p-10 font-['Lato'] text-[#2C2C2C] bg-[#F5F5F0] min-h-[calc(100vh-4rem)] relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 rounded-full blur-3xl mix-blend-overlay pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#2E7D32]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#6D4C41] flex items-center gap-2">
                <Lock size={14} /> Finalized itinerary
              </div>
              <div className="text-3xl font-bold font-['Playfair_Display'] text-[#2C2C2C] truncate mt-1">
                {title}
              </div>
              {!isFinal && (
                <div className="text-sm text-[#6D4C41]/80 mt-1">
                  This trip is not finalized yet.
                </div>
              )}
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#6D4C41] bg-[#F5F5F0] px-3 py-2 rounded-full border border-[#E5E7EB]">
              <Lock size={14} /> Read-only
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-[#6D4C41]">Loading...</div>
          ) : !trip ? (
            <div className="text-center py-20 text-[#6D4C41]">Trip not found.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#E5E7EB] p-4 bg-[#F5F5F0]/40">
                <TripMap trip={trip} mapHeightClass="h-[220px]" />
              </div>
              <div className="lg:col-span-8 p-4">
                <Itinerary
                  trip={trip}
                  currentUserId={currentUserId}
                  onTripUpdated={fetchTrip}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {trip && <AIAssistant tripId={trip._id} onItineraryUpdated={fetchTrip} />}
    </div>
  );
}

