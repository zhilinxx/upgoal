import { API } from "./auth";

const ROOT = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
const API_BASE = `${ROOT}/api`;
const BUDGET_BASE = `${API_BASE}/budget`;

//Dashboard

export const getDashboard = (userId) =>
  API.get(`${BUDGET_BASE}/dashboard`, { params: { userId } });

export async function fetchDashboardData() {
  const userId = Number(localStorage.getItem("userId"));
  if (!userId) throw new Error("Missing userId in localStorage");
  const { data } = await getDashboard(userId);
  return data;
}

//Rules

export const postAlerts = (payload) =>
  API.post(`${BUDGET_BASE}/rules/alerts`, payload);

export const postAdjustBudgets = (payload) =>
  API.post(`${BUDGET_BASE}/rules/adjust-budgets`, payload);

//Savings Goals

export const listGoals = () =>
  API.get(`/budget/goals`, {
    params: { userId: Number(localStorage.getItem("userId")) },
  });

export const createGoal = (payload) =>
  API.post(`/budget/goals`, {
    userId: Number(localStorage.getItem("userId")),
    ...payload,
  });

export const updateGoal = (id, payload) =>
  API.put(`/budget/goals/${id}`, {
    userId: Number(localStorage.getItem("userId")),
    ...payload,
  });

export const deleteGoal = (id) =>
  API.delete(`/budget/goals/${id}`, {
    data: { userId: Number(localStorage.getItem("userId")) },
  });
