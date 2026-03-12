import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserTrips } from "../api/trips";
import CreateTrip from "../components/CreateTrip";
import { MapPin, CalendarDays, DollarSign, Users } from "lucide-react";

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
  const navigate = useNavigate();

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

  useEffect(() => {
    fetchTrips();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Trips</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Your shared travel workspaces
          </p>
        </div>
        <CreateTrip onTripCreated={fetchTrips} />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading trips...</div>
      ) : trips.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm mb-4">
            No trips yet. Create your first trip!
          </p>
          <CreateTrip onTripCreated={fetchTrips} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip) => (
            <div
              key={trip._id}
              onClick={() => navigate(`/dashboard/trip/${trip._id}`)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <h3 className="font-semibold text-lg text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {trip.name}
              </h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-blue-500 shrink-0" />
                  <span className="truncate">{trip.destination}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays
                    size={14}
                    className="text-indigo-500 shrink-0"
                  />
                  <span>
                    {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-green-500 shrink-0" />
                  <span>Budget: ${trip.budget.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-purple-500 shrink-0" />
                  <span>
                    {trip.members.length} member
                    {trip.members.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                Created by {trip.createdBy?.username}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
