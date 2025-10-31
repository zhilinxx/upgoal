import { API } from "./auth";

// insurancePlanAPI.js
export const getAllPlans = (search, page = 1, limit = 10, type = "All") =>
  API.get(`/insurancePlans?search=${search}&page=${page}&limit=${limit}&type=${type}`);

export const getPlanById = (id) =>
  API.get(`/insurancePlans/${id}`);

export const addPlan = (formData) =>
  API.post("/insurancePlans", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updatePlan = (id, formData) =>
  API.put(`/insurancePlans/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deletePlans = (planIds) =>
  API.delete("/insurancePlans", { data: { planIds } });
