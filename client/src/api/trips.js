import api from "./axios";

export const createTrip = (tripData) => api.post("trips", tripData);
export const getUserTrips = () => api.get("trips");
export const getTripById = (tripId) => api.get(`trips/${tripId}`);
export const updateTripDetails = (tripId, type, data) =>
  api.patch(`trips/${tripId}/details`, { type, data });
export const addDestination = (tripId, data) =>
  api.post(`trips/${tripId}/destinations`, data);
export const removeDestination = (tripId, destId) =>
  api.delete(`trips/${tripId}/destinations/${destId}`);
export const inviteToTrip = (tripId, friendId) =>
  api.post(`trips/${tripId}/invite`, { friendId });
export const getTripInvitations = () => api.get("trips/invitations");
export const respondToTripInvitation = (tripId, accept) =>
  api.post(`trips/${tripId}/respond`, { accept });
export const updateTripRoute = (tripId, data) =>
  api.patch(`trips/${tripId}/route`, data);
export const getTripMessages = (tripId) => api.get(`/trips/${tripId}/messages`);
export const leaveTrip = (tripId) => api.post(`trips/${tripId}/leave`);
export const deleteTrip = (tripId) => api.delete(`trips/${tripId}`);
export const getAgentPlaygroundData = (tripId) => api.get(`trips/${tripId}/playground`);
