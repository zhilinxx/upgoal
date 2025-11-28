// client/src/API/budgetAPI.js
import { API } from "./auth";

/* =========================
   Budget-specific endpoints
   ========================= */

// Base for budget routes
const BUDGET_BASE = `${API_BASE}/budget`;

// --- Dashboard ---
export const getDashboard = (userId) =>
  API.get(`${BUDGET_BASE}/dashboard`, { params: { userId } });

export async function fetchDashboardData() {
  const userId = Number(localStorage.getItem("userId"));
  if (!userId) throw new Error("Missing userId in localStorage");
  const { data } = await getDashboard(userId);
  return data;
}

// --- Rules endpoints (if you still use them) ---
export const postAlerts = (payload) =>
  API.post(`${BUDGET_BASE}/rules/alerts`, payload);

export const postAdjustBudgets = (payload) =>
  API.post(`${BUDGET_BASE}/rules/adjust-budgets`, payload);

/* =========================
   Savings Goals endpoints
   (using the same budgetAPI client)
   ========================= */

export const listGoals = () =>
  API.get(`/budget/goals`, {
    params: { userId: Number(localStorage.getItem("userId")) },
  });

// POST /API/budget/goals
export const createGoal = (payload) =>
  API.post(`/budget/goals`, {
    userId: Number(localStorage.getItem("userId")),
    ...payload,
  });

// PUT /API/budget/goals/:id
export const updateGoal = (id, payload) =>
  API.put(`/budget/goals/${id}`, {
    userId: Number(localStorage.getItem("userId")),
    ...payload,
  });

// DELETE /API/budget/goals/:id
export const deleteGoal = (id) =>
  API.delete(`/budget/goals/${id}`, {
    data: { userId: Number(localStorage.getItem("userId")) },
  });
