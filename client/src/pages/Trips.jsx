import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserTrips, leaveTrip, deleteTrip } from "../api/trips";
import CreateTrip from "../components/CreateTrip";
import {
  MapPin,
  CalendarDays,
  DollarSign,
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
                  {trip.destinations?.length > 0 ? (
                    <span className="truncate">
                      {trip.destinations
                        .map((d) => `${d.city}, ${d.country}`)
                        .join(" · ")}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">
                      No destinations yet
                    </span>
                  )}
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
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Created by {trip.createdBy?.username}
                </span>
                {trip.createdBy?._id === currentUserId ? (
                  <button
                    onClick={(e) => handleDeleteTrip(e, trip._id)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                    title="Delete Trip"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                ) : (
                  <button
                    onClick={(e) => handleLeaveTrip(e, trip._id)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                    title="Leave Trip"
                  >
                    <LogOut size={12} /> Leave
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
