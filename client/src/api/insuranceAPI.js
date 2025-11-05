// src/api/insuranceAPI.js
import { API } from "./auth"; // ✅ reuse the configured axios instance

// get all insurance providers (for filter dropdown)
export const getProviders = async () => {
  return API.get("/insurance/providers");
};

// retrieve insurance plan at insurance recommendations page
export const getInsuranceRecommendations = async (userId, filters = {}) => {
  return API.get(`/insurance/recommendations/${userId}`, {
    params: filters, // pass filter options to backend
  });
};
export const getPlanScore = (planId, userId, sumMax) => 
  API.get("/insurance/planScore", {
    params: { planId, userId, sumMax },
  });

//insurance profile setup
export const saveInsuranceProfile = async (profileData) => {
  return API.post("/insurance/save", profileData);
};

export const getInsuranceProfile = async (userId) => {
  return API.get(`/insurance/${userId}`);
};

export const getPlanById = async (planId, userId) => {
  return API.get(`/insurance/plan/${planId}`, {
    params: { userId },
  });
};