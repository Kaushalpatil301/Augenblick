import api from "./axios";

export const searchUsers = (query) => api.post("friends/search", { query });
export const sendFriendRequest = (targetUserId) =>
  api.post(`/friends/request/${targetUserId}`);
export const acceptFriendRequest = (senderId) =>
  api.post(`/friends/accept/${senderId}`);
export const rejectFriendRequest = (senderId) =>
  api.post(`/friends/reject/${senderId}`);
export const getFriendRequests = () => api.get("/friends/requests");
export const getFriends = () => api.get("/friends/all");
