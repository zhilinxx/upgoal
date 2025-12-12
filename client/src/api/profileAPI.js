// api/profileAPI.js
import { API } from "./auth"; 


// === Profile functions ===
export const getProfile = async () => {
  return API.get("/profile/me");
};