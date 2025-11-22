// api/profileAPI.js
import { API } from "./auth"; // reuse your configured axios instance


// === Profile functions ===
export const getProfile = async () => {
  return API.get("/profile/me", { withCredentials: true });
};