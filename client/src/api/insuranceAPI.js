// src/api/insuranceAPI.js
import { API } from "./auth"; // ✅ reuse the configured axios instance

// get all insurance providers (for filter dropdown)
export const getProviders = async () => {
  return API.get("/insurance/providers");
};

// retrieve insurance plan at insurance recommendations page
export const getRecommendations = async (userId, filters = {}) => {
  return API.get(`/insurance/recommendations/${userId}`, {
    params: filters, // pass filter options to backend
  });
};

//insurance profile setup
export const saveInsuranceProfile = async (profileData) => {
  return API.post("/insurance/save", profileData);
};
