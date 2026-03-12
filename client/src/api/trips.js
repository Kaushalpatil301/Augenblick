import api from "./axios";

export const createTrip = (tripData) => api.post("/trips", tripData);
export const getUserTrips = () => api.get("/trips");
export const getTripById = (tripId) => api.get(`/trips/${tripId}`);
export const updateTripDetails = (tripId, type, data) =>
  api.patch(`/trips/${tripId}/details`, { type, data });
export const inviteToTrip = (tripId, friendId) =>
  api.post(`/trips/${tripId}/invite`, { friendId });
export const getTripInvitations = () => api.get("/trips/invitations");
export const respondToTripInvitation = (tripId, accept) =>
  api.post(`/trips/${tripId}/respond`, { accept });
export const getTripMessages = (tripId) => api.get(`/trips/${tripId}/messages`);
