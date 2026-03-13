import api from "./axios";

export const createTrip = (tripData) => api.post("trips", tripData);
export const generateTripDraft = (prompt, currentLocation) =>
  api.post("trips/draft", { prompt, currentLocation });
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
export const getTripActivities = (tripId) => api.get(`trips/${tripId}/activities`);

// Collaborative itinerary
export const voteItineraryItem = (tripId, payload) =>
  api.post(`trips/${tripId}/itinerary/vote`, payload);
export const createItineraryChange = (tripId, payload) =>
  api.post(`trips/${tripId}/itinerary/changes`, payload);
export const decideItineraryChange = (tripId, changeId, accept) =>
  api.post(`trips/${tripId}/itinerary/changes/${changeId}/decision`, { accept });
export const finalizeItinerary = (tripId) =>
  api.post(`trips/${tripId}/itinerary/finalize`);
export const unfinalizeItinerary = (tripId) =>
  api.post(`trips/${tripId}/itinerary/unfinalize`);
export const chatItineraryWithGemini = (tripId, message) =>
  api.post(`trips/${tripId}/ai/chat`, { message });
