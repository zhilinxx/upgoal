// api/profileAPI.js
import { API } from "./auth"; // reuse your configured axios instance


// === Profile functions ===
export const getProfile = async () => {
  return API.get("http://localhost:5000/api/profile/me", { withCredentials: true });
};
export const updateInsuranceProfile = (data) => API.put("/profile/insurance", data);