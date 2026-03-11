import api from "./axios.js";

export const registerUser = (userData) => {
  // Check for invite token in localStorage
  const inviteToken = localStorage.getItem("inviteToken");
  if (inviteToken) {
    userData.inviteToken = inviteToken;
  }
  return api.post("/auth/register", userData);
};

export const loginUser = (credentials) => {
  // Check for invite token in localStorage
  const inviteToken = localStorage.getItem("inviteToken");
  if (inviteToken) {
    credentials.inviteToken = inviteToken;
  }
  return api.post("/auth/login", credentials);
};

// export const logoutUser = () => {
//   return api.post("/auth/logout");
// };