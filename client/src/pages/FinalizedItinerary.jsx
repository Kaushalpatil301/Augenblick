import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTripById } from "../api/trips";
import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import TripMap from "../components/TripMap";
import Itinerary from "../components/Itinerary";
import AIAssistant from "../components/AIAssistant";
import ExpenseTracker from "../components/ExpenseTracker";

export default function FinalizedItinerary() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("itinerary");

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
  const title = useMemo(
    () => trip?.name || "Finalized itinerary",
    [trip?.name],
  );

  return (
    <div className="p-6 md:p-10 font-['Lato'] text-[#2C2C2C] bg-[#F5F5F0] min-h-[calc(100vh-4rem)] relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 rounded-full blur-3xl mix-blend-overlay pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#2E7D32]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/finalized")}
          className="mb-6 gap-2 text-[#6D4C41] hover:bg-white hover:text-[#2C2C2C] px-4 py-2 rounded-xl border border-transparent hover:border-[#E5E7EB] transition-all bg-white/50 shadow-sm backdrop-blur-sm w-fit"
        >
          <ArrowLeft size={18} /> Back to Finalized Trips
        </Button>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="px-6 py-6 border-b border-[#E5E7EB] flex items-start justify-between gap-4 flex-wrap bg-[#fdfbf9]">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider text-[#6D4C41] flex items-center gap-2 mb-2">
                <Lock size={14} className="text-[#2E7D32]" /> Finalized itinerary
              </div>
              <div className="text-3xl md:text-4xl font-bold font-['Playfair_Display'] text-[#2C2C2C] truncate">
                {title}
              </div>
              {!isFinal && (
                <div className="text-sm font-medium text-[#F4A261] mt-2">
                  Note: This trip is not marked as finalized yet.
                </div>
              )}
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-4 py-2 rounded-xl border border-[#2E7D32]/20 shadow-sm">
              <Lock size={14} /> Read-only Mode
            </div>
          </div>

          {!loading && trip && (
            <div className="flex border-b border-[#E5E7EB] bg-[#F5F5F0]/20 px-4">
              <button
                onClick={() => setActiveTab("itinerary")}
                className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${
                  activeTab === "itinerary"
                    ? "border-green-600 text-[#2C2C2C]"
                    : "border-transparent text-[#6D4C41] hover:text-[#2C2C2C]"
                }`}
              >
                Itinerary Overview
              </button>
              <button
                onClick={() => setActiveTab("expenses")}
                className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${
                  activeTab === "expenses"
                    ? "border-green-600 text-[#2C2C2C]"
                    : "border-transparent text-[#6D4C41] hover:text-[#2C2C2C]"
                }`}
              >
                Expenses & Balances
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20 text-[#6D4C41]">Loading...</div>
          ) : !trip ? (
            <div className="text-center py-20 text-[#6D4C41]">
              Trip not found.
            </div>
          ) : activeTab === "itinerary" ? (
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
          ) : (
            <div className="bg-[#F5F5F0]/10">
              <ExpenseTracker
                tripId={trip._id}
                currentUserId={currentUserId}
                members={trip.members}
              />
            </div>
          )}
        </div>
      </div>
      {trip && <AIAssistant tripId={trip._id} onItineraryUpdated={fetchTrip} />}
    </div>
  );
}
